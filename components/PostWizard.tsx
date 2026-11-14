'use client';
import Link from 'next/link';
import { cloneElement, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, DealType, Hotspot, Listing, Placement, SellerType, TourRoom, User } from '@/lib/types';
import {
  CATS, CAT_KEYS, CENTERS, DISTRICTS, FIELD_DEFS, FIELDS_BY_CAT, PAY_TERMS, PLACEMENTS, POSTING_FEE, ROOM_NAMES, STATUS_MN, type FieldKey,
} from '@/lib/constants';
import { fmtDate, fmtFull, fmtPrice } from '@/lib/format';
import { createListing, getListing, getPhone, updateListing } from '@/lib/api/listings';
import PageLoader from './PageLoader';
import { useAuth } from './Auth';
import { canvasToBlob, resizeImage, upload } from '@/lib/images';
import { dropAllLocal, dropLocal, getLocal, keepLocal } from '@/lib/localFiles';
import { getPannellum, type PannellumViewer } from '@/lib/pannellum';
import { stitch } from '@/lib/stitch';
import { PanoError, panoView, preparePano, vaovFor } from '@/lib/pano';
import ListingCard from './ListingCard';
import CatIcon from './CatIcon';
import CaptureGuide from './CaptureGuide';
import { LocationPicker } from './Maps';
import { useToast } from './Toast';
import Icon from './Icon';

/* ---------- draft model ---------- */
/* Images stay on this device until the listing is submitted (see lib/localFiles.ts): a picked photo or a finished
   panorama has a `localId` and a blob: URL; "Нийтлэх" / "Хадгалах" uploads them to R2 first, then saves the listing. */
type DraftPhoto = { key: string; preview: string; src?: string; width?: number; height?: number; processing: boolean; localId?: string };
type DraftRoom = TourRoom & { files?: File[]; fov?: number; photoCount?: number; progress?: number; progressText?: string; localId?: string };
interface Draft {
  dealType: DealType; category: Category; title: string; price: string; description: string;
  fields: Partial<Record<FieldKey, string>>; garage: boolean; leasing: boolean; paymentTerms: string[];
  photos: DraftPhoto[];
  tour: { startRoomId: string | null; rooms: DraftRoom[] };
  location: { district: string; khoroo: string; address: string; lat: number | null; lng: number | null };
  sellerName: string; sellerPhone: string; sellerType: SellerType; placement: Placement; payMethod: string;
}
const newDraft = (user: User): Draft => ({
  dealType: 'sale', category: 'apartment', title: '', price: '', description: '', fields: {}, garage: false, leasing: false, paymentTerms: ['Бэлэн'],
  photos: [], tour: { startRoomId: null, rooms: [] },
  location: { district: '', khoroo: '', address: '', lat: null, lng: null },
  sellerName: user.name, sellerPhone: user.phone, sellerType: 'agent', placement: 'free', payMethod: 'qpay',
});
/** An existing listing as a wizard draft (admin edit). Photos and 360° rooms are already uploaded, so they start "done". */
const listingToDraft = (l: Listing, phone: string): Draft => ({
  dealType: l.dealType, category: l.category, title: l.title, price: l.price ? String(l.price) : '', description: l.description || '',
  fields: Object.fromEntries((Object.keys(FIELD_DEFS) as FieldKey[]).filter((k) => l[k] != null && l[k] !== '').map((k) => [k, String(l[k])])),
  garage: !!l.garage, leasing: !!l.leasing, paymentTerms: l.paymentTerms?.length ? l.paymentTerms : ['Бэлэн'],
  photos: l.photos.map((p, i) => ({ key: `p${i}`, preview: p.src, src: p.src, width: p.width, height: p.height, processing: false })),
  tour: { startRoomId: l.tour?.startRoomId ?? null, rooms: (l.tour?.rooms ?? []).map((r) => ({ ...r })) },
  location: { district: l.location.district, khoroo: l.location.khoroo || '', address: l.location.address || '', lat: l.location.lat, lng: l.location.lng },
  sellerName: l.sellerName, sellerPhone: phone, sellerType: l.sellerType, placement: l.placement, payMethod: 'qpay',
});
type EditInfo = { id: string; listing: Listing; initial: Draft };

// Keeps an unfinished draft while the user browses other pages, but never hands one user's draft to another.
let draftCache: { userId: string; draft: Draft } | null = null;

/* The draft also survives a reload or a closed tab (localStorage, per user). Pending images live in IndexedDB
   (lib/localFiles) and are re-attached by `localId` when the draft is restored; blob: URLs don't survive a reload,
   so they are stored empty. Photos still being resized and rooms still being stitched are dropped. */
const DRAFT_KEY = (userId: string) => `post-draft:${userId}`;
const isBlobUrl = (u?: string) => !!u && /^(blob|data):/.test(u);
function storable(d: Draft): Draft {
  const rooms = d.tour.rooms
    .filter((r) => r.status === 'ready' && r.panorama && (r.localId || !isBlobUrl(r.panorama.src)))
    .map(({ files: _f, progress: _p, progressText: _t, ...r }) => (r.localId ? { ...r, panorama: { ...r.panorama!, src: '' } } : r));
  return {
    ...d,
    photos: d.photos.filter((p) => !p.processing && (p.localId || (p.src && !isBlobUrl(p.src))))
      .map((p) => (p.localId ? { ...p, preview: '', src: '' } : { ...p, preview: p.src! })),
    tour: { startRoomId: rooms.some((r) => r.id === d.tour.startRoomId) ? d.tour.startRoomId : rooms[0]?.id ?? null, rooms },
  };
}

/** Uploads every image still on this device (photos → public R2 URL, panoramas → API URL), one by one.
 *  `onItem` gets the draft after each upload, so a failure part-way keeps what was already sent and a retry
 *  continues from there. Resolves to the draft with only remote URLs, ready for createListing / updateListing. */
async function uploadPending(start: Draft, onItem: (d: Draft) => void, onProgress: (done: number, total: number) => void): Promise<Draft> {
  let d = start;
  const total = d.photos.filter((p) => p.localId).length + d.tour.rooms.filter((r) => r.localId).length;
  let done = 0;
  const step = () => { onItem(d); onProgress(++done, total); };
  onProgress(0, total);
  const blobOf = async (id: string) => {
    const b = await getLocal(id);
    if (!b) throw new Error('Зарим зураг энэ төхөөрөмж дээр олдсонгүй. Тэр зургийг устгаад дахин нэмнэ үү.');
    return b;
  };
  try {
    for (const p of start.photos) {
      if (!p.localId) continue;
      const url = await upload(await blobOf(p.localId), true);
      if (isBlobUrl(p.src)) URL.revokeObjectURL(p.src!);
      d = { ...d, photos: d.photos.map((x) => (x.key === p.key ? { ...x, src: url, preview: url, localId: undefined } : x)) };
      dropLocal(p.localId);
      step();
    }
    for (const r of start.tour.rooms) {
      if (!r.localId || !r.panorama) continue;
      const url = await upload(await blobOf(r.localId));
      if (isBlobUrl(r.panorama.src)) URL.revokeObjectURL(r.panorama.src);
      d = { ...d, tour: { ...d.tour, rooms: d.tour.rooms.map((x) => (x.id === r.id ? { ...x, panorama: { ...x.panorama!, src: url }, localId: undefined } : x)) } };
      dropLocal(r.localId);
      step();
    }
  } catch (e) {
    throw new Error(`Зураг илгээж чадсангүй (${done}/${total} илгээгдсэн). ${(e as Error).message}\nИлгээгдсэн зургууд хадгалагдсан тул дахин дарахад үлдсэнийг нь илгээнэ.`);
  }
  return d;
}
function loadStoredDraft(user: User): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(user.id));
    if (!raw) return null;
    const saved = JSON.parse(raw) as { v: number; at: number; draft: Draft };
    if (saved.v !== 1 || Date.now() - saved.at > 30 * 24 * 3600 * 1000) return null; // older than 30 days: start fresh
    return { ...newDraft(user), ...saved.draft };
  } catch { return null; }
}
function saveStoredDraft(userId: string, d: Draft | null) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY(userId), JSON.stringify({ v: 1, at: Date.now(), draft: storable(d) }));
    else localStorage.removeItem(DRAFT_KEY(userId));
  } catch { /* private mode / storage full: the in-memory draft still works */ }
}

const STEP_NAMES = ['Ангилал', 'Мэдээлэл', 'Зураг', '360° аялал', 'Байршил', 'Холбоо барих', 'Нийтлэх'];
const uid = () => Math.random().toString(36).slice(2, 8);

type SetDraft = React.Dispatch<React.SetStateAction<Draft>>;

/** New ad, or with `editId` the admin edit screen for an existing one (same steps, prefilled, no payment step). */
export default function PostWizard({ editId }: { editId?: string }) {
  const { user } = useAuth();
  if (!user) return null;
  return editId ? <EditLoader id={editId} user={user} /> : <Wizard user={user} />;
}

function EditLoader({ id, user }: { id: string; user: User }) {
  const [edit, setEdit] = useState<EditInfo | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let stale = false;
    getListing(id)
      .then(async (l) => {
        const phone = await getPhone(id).catch(() => '');
        if (!stale) setEdit({ id, listing: l, initial: listingToDraft(l, phone) });
      })
      .catch((e: Error) => { if (!stale) setError(e.message); });
    return () => { stale = true; };
  }, [id]);
  if (error) return <div className="empty">{error} <Link href="/admin">Админ самбар руу буцах</Link></div>;
  if (!edit) return <PageLoader />;
  return <Wizard user={user} edit={edit} />;
}

/** The body createListing expects, from a draft. Shared by publish and (once wired) admin save. */
const draftToInput = (d: Draft) => ({
  dealType: d.dealType, category: d.category, title: d.title, price: d.price, description: d.description,
  ...d.fields, garage: d.garage, leasing: d.leasing, paymentTerms: d.paymentTerms,
  photos: d.photos.filter((p) => p.src).map((p) => ({ src: p.src, width: p.width, height: p.height })),
  tour: {
    startRoomId: d.tour.startRoomId,
    rooms: d.tour.rooms.filter((r) => r.status === 'ready').map((r) => ({ id: r.id, name: r.name, source: r.source, panorama: r.panorama, startYaw: r.startYaw, hotspots: r.hotspots, haov: r.haov, vaov: r.vaov })),
  },
  location: d.location, sellerName: d.sellerName, sellerPhone: d.sellerPhone, sellerType: d.sellerType, placement: d.placement,
});

function Wizard({ user, edit }: { user: User; edit?: EditInfo }) {
  const toast = useToast();
  const router = useRouter();
  // where the starting draft came from: 'stored' shows the "draft restored" notice
  const [origin] = useState<'edit' | 'memory' | 'stored' | 'new'>(() =>
    edit ? 'edit' : draftCache?.userId === user.id ? 'memory' : loadStoredDraft(user) ? 'stored' : 'new');
  const [d, setD] = useState<Draft>(() =>
    edit ? edit.initial : draftCache?.userId === user.id ? draftCache.draft : loadStoredDraft(user) ?? newDraft(user));
  const [restored, setRestored] = useState(origin === 'stored' && JSON.stringify(d) !== JSON.stringify(newDraft(user)));
  // edit mode has no payment/publish step
  const steps = edit ? STEP_NAMES.slice(0, -1) : STEP_NAMES;
  const initialJson = useRef(edit ? JSON.stringify(edit.initial) : '');
  const dirty = !!edit && JSON.stringify(d) !== initialJson.current;
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState<{ done: number; total: number } | null>(null); // image uploads on submit
  const [done, setDone] = useState<{ id: string; status: string } | null>(null);
  const [tried, setTried] = useState<Record<number, boolean>>({}); // steps where "Дараах" was pressed: show every error
  useEffect(() => {
    if (edit) return;
    draftCache = { userId: user.id, draft: d };
    const t = setTimeout(() => saveStoredDraft(user.id, d), 400);
    return () => clearTimeout(t);
  }, [d, user.id, edit]);
  const startOver = () => { draftCache = null; saveStoredDraft(user.id, null); dropAllLocal(user.id); setD(newDraft(user)); setStep(0); setTried({}); setRestored(false); };
  // a draft restored from storage has its pending images in IndexedDB: give them fresh blob: URLs (once, on open)
  useEffect(() => {
    const ids = [...d.photos.filter((p) => p.localId && !p.src).map((p) => p.localId!),
      ...d.tour.rooms.filter((r) => r.localId && !r.panorama?.src).map((r) => r.localId!)];
    if (!ids.length) return;
    let stale = false;
    Promise.all(ids.map(async (id) => [id, await getLocal(id)] as const)).then((pairs) => {
      if (stale) return;
      const url = new Map(pairs.map(([id, b]) => [id, b ? URL.createObjectURL(b) : null]));
      if (pairs.some(([, b]) => !b)) toast('Зарим зураг энэ төхөөрөмж дээр олдсонгүй — дахин нэмнэ үү.');
      setD((x) => {
        const photos = x.photos.flatMap((p) => {
          if (!p.localId || p.src || !url.has(p.localId)) return [p];
          const u = url.get(p.localId);
          return u ? [{ ...p, src: u, preview: u }] : [];
        });
        const rooms = x.tour.rooms.flatMap((r) => {
          if (!r.localId || r.panorama?.src || !url.has(r.localId)) return [r];
          const u = url.get(r.localId);
          return u ? [{ ...r, panorama: { ...r.panorama!, src: u } }] : [];
        });
        const startRoomId = rooms.some((r) => r.id === x.tour.startRoomId) ? x.tour.startRoomId : rooms[0]?.id ?? null;
        return { ...x, photos, tour: { startRoomId, rooms } };
      });
    });
    return () => { stale = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // warn before closing the tab with unsaved edits
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function validate(s: number): string | null {
    if (s === 1) {
      const msgs = Object.values(detailIssues(d).errors);
      if (msgs.length === 1) return msgs[0]!;
      if (msgs.length) return `${msgs.length} талбарт алдаа байна. Улаанаар тэмдэглэсэн хэсгүүдийг засна уу.`;
    }
    if (s === 2 && d.photos.some((p) => p.processing)) return 'Зургууд боловсруулж дуусаагүй байна.';
    if (s === 3 && d.tour.rooms.some((r) => r.status === 'processing')) return '360° зураг боловсруулж дуусаагүй байна.';
    if (s === 4) {
      if (!d.location.district) return 'Дүүргээ сонгоно уу.';
      if (d.location.lat == null) return 'Газрын зураг дээр дарж байршлаа тэмдэглэнэ үү.';
    }
    if (s === 5) {
      if (!d.sellerName.trim()) return 'Нэрээ оруулна уу.';
      if (!/^\d{8}$/.test(d.sellerPhone.replace(/\D/g, ''))) return 'Утасны дугаар 8 оронтой байна.';
    }
    return null;
  }
  const go = (s: number) => { setError(''); setStep(Math.max(0, Math.min(steps.length - 1, s))); window.scrollTo(0, 0); };
  // on a failed step, mark it tried and move focus to the first invalid field so the user sees what to fix
  const fail = (s: number, e: string) => {
    setTried((t) => ({ ...t, [s]: true }));
    setError(e);
    setTimeout(() => document.querySelector<HTMLElement>('.wizard [aria-invalid="true"]')?.focus(), 0);
  };
  const next = () => { const e = validate(step); if (e) fail(step, e); else go(step + 1); };

  async function publish() {
    for (let s = 1; s <= 5; s++) { const e = validate(s); if (e) { go(s); fail(s, e); return; } }
    setError('');
    setBusy(true);
    try {
      const ready = await uploadPending(d, setD, (n, total) => setSending({ done: n, total }));
      setSending(null);
      const res = await createListing(draftToInput(ready));
      draftCache = null;
      saveStoredDraft(user.id, null);
      dropAllLocal(user.id);
      // agents pay (QPay) before the listing goes to admin review; admins publish straight away
      if (res.status === 'unpaid') { router.push(`/pay/${res.id}`); return; }
      setDone(res);
    } catch (e) { setError((e as Error).message); }
    setSending(null);
    setBusy(false);
  }

  // Admin save: validates like publish, then PATCHes the post (server allows content edits for admins only)
  async function save() {
    if (!edit) return;
    for (let s = 1; s <= 5; s++) { const e = validate(s); if (e) { go(s); fail(s, e); return; } }
    setError('');
    setBusy(true);
    try {
      const ready = await uploadPending(d, setD, (n, total) => setSending({ done: n, total }));
      setSending(null);
      await updateListing(edit.id, draftToInput(ready));
      initialJson.current = JSON.stringify(ready); // saved state is the new baseline: "unsaved changes" clears
      toast('Өөрчлөлт хадгалагдлаа');
    } catch (e) { setError((e as Error).message); }
    setSending(null);
    setBusy(false);
  }

  if (done) {
    const live = done.status === 'active';
    return (
      <div className="panel done-card">
        <Icon name="check" size={48} className="icon-feature icon-success" /><h1>{live ? 'Зар нийтлэгдлээ' : 'Зар илгээгдлээ'}</h1>
        <p>Зарын дугаар: <b>{done.id}</b>. {live ? 'Нийтэд харагдаж байна.' : 'Админ шалгаж баталсны дараа нийтэд харагдана.'}</p>
        <p>
          {live && <><Link className="btn btn-primary" href={`/listing/${done.id}`}>Зарыг харах</Link>{' '}</>}
          <Link className={`btn ${live ? '' : 'btn-primary'}`} href="/my">Миний зар</Link>
          {user.role === 'admin' && <>{' '}<Link className="btn" href="/admin">Админ самбар</Link></>}
        </p>
        <button className="btn btn-sm" onClick={() => { startOver(); setDone(null); }}>Шинэ зар нэмэх</button>
      </div>
    );
  }

  const Step = [StepCategory, StepDetails, StepPhotos, StepTour, StepLocation, StepContact, StepPublish][step];
  return (
    <div className={`wizard${edit ? ' wizard-edit' : ''}`}>
      {edit ? (
        <div className="edit-head">
          <div className="edit-crumbs"><Link href="/admin">Админ самбар</Link> › Зар засах</div>
          <div className="edit-title">
            <div className="min-w-0">
              <h1>{d.title.trim() || 'Гарчиггүй зар'}</h1>
              <div className="edit-meta">
                <span>№ {edit.id}</span>
                <span className={`edit-status st-${edit.listing.status}`}>{STATUS_MN[edit.listing.status]}</span>
                <span>Нийтэлсэн {fmtDate(edit.listing.createdAt)}</span>
                <span>{edit.listing.views} үзэлт</span>
                <Link href={`/listing/${edit.id}`} target="_blank">Зарыг харах <Icon name="external" size={13} /></Link>
              </div>
            </div>
            <div className="edit-actions">
              <span className={`edit-state${dirty ? ' dirty' : ''}`}>{dirty ? 'Хадгалаагүй өөрчлөлт' : 'Өөрчлөлтгүй'}</span>
              <Link className="btn" href="/admin">Болих</Link>
              <button className="btn btn-primary" disabled={!dirty || busy} onClick={save}>{sending?.total ? `Зураг илгээж байна ${sending.done}/${sending.total}…` : busy ? 'Хадгалж байна…' : 'Хадгалах'}</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="wiz-head">
          <h1>Зар нэмэх</h1>
          <span className="wiz-count">Алхам {step + 1} / {steps.length}</span>
        </div>
      )}
      {restored && (
        <div className="draft-note" role="status">
          <span>Өмнөх ноорог тань зурагтайгаа сэргээгдлээ.</span>
          <button type="button" className="btn btn-sm" onClick={startOver}>Шинээр эхлэх</button>
          <button type="button" className="draft-note-x" aria-label="Хаах" onClick={() => setRestored(false)}>×</button>
        </div>
      )}
      <ol className="wsteps" aria-label={edit ? 'Засах хэсгүүд' : 'Зар нэмэх алхамууд'}>
        {steps.map((n, i) => {
          // edit: every section is already filled, so any step can be opened directly
          const state = i === step ? 'on' : edit || i < step ? 'done' : '';
          return (
            <li key={n} className={state}>
              <button type="button" aria-current={i === step ? 'step' : undefined}
                onClick={() => { if (edit || i <= step) go(i); else if (i === step + 1) next(); }}
                disabled={!edit && i > step + 1} title={!edit && i > step + 1 ? 'Өмнөх алхмуудаа эхлээд бөглөнө үү' : undefined}>
                <span className="dot">{i === step ? i + 1 : edit || i < step ? '✓' : i + 1}</span>
                <span className="lbl">{n}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="panel"><Step d={d} setD={setD} toast={toast} user={user} tried={!!tried[step]} /></div>
      {error && !(step === 1 && !validate(1)) && <div className="error-box mt-3" role="alert">{error}</div>}
      <div className="wizard-nav">
        <button className="btn" disabled={step === 0} onClick={() => go(step - 1)}>‹ Буцах</button>
        {edit ? (
          <div className="wizard-nav-r">
            {step < steps.length - 1 && <button className="btn" onClick={() => go(step + 1)}>Дараах ›</button>}
            <button className="btn btn-primary" disabled={!dirty || busy} onClick={save}>{sending?.total ? `Зураг илгээж байна ${sending.done}/${sending.total}…` : busy ? 'Хадгалж байна…' : 'Хадгалах'}</button>
          </div>
        ) : step < steps.length - 1
          ? <button className="btn btn-primary" onClick={next}>Дараах ›</button>
          : <button className="btn btn-accent" disabled={busy} onClick={publish}>{sending?.total ? `Зураг илгээж байна ${sending.done}/${sending.total}…` : busy ? 'Илгээж байна…' : user.role === 'admin' ? 'Нийтлэх' : 'Төлбөр төлөх ›'}</button>}
      </div>
    </div>
  );
}

type StepProps = { d: Draft; setD: SetDraft; toast: (m: string) => void; user: User; tried: boolean };

/* ---------- 1. category ---------- */
const DEALS: { key: DealType; name: string; hint: string }[] = [
  { key: 'sale', name: 'Зарна', hint: 'Үл хөдлөх хөрөнгөө худалдана' },
  { key: 'rent', name: 'Түрээслүүлнэ', hint: 'Сар, жилээр түрээсэд гаргана' },
];
const CAT_HINTS: Record<Category, string> = {
  apartment: 'Байр, студи, пентхаус',
  house: 'Хашаатай байшин, амины сууц',
  land: 'Өмчийн болон эзэмшлийн газар',
  office: 'Ажлын өрөө, бизнес төв',
  shop: 'Дэлгүүр, салон, ресторан',
  warehouse: 'Агуулах, үйлдвэрийн байр',
  garage: 'Дулаан гараж, авто зоорь',
  summer_house: 'Хотын захын амралтын байшин',
};

function StepCategory({ d, setD }: StepProps) {
  return (
    <>
      <h2 className="wiz-title">Ямар зар оруулах вэ?</h2>
      <p className="muted wiz-sub">Доорх 2 асуултад хариулаад «Дараах» товчийг дарна уу.</p>

      <fieldset className="wq">
        <legend><span className="wq-n">1</span>Зарах уу, түрээслүүлэх үү?</legend>
        <div className="choice-row" role="radiogroup">
          {DEALS.map((t) => {
            const on = d.dealType === t.key;
            return (
              <button key={t.key} type="button" role="radio" aria-checked={on} className={`choice ${on ? 'on' : ''}`}
                onClick={() => setD((x) => ({ ...x, dealType: t.key }))}>
                <span className="radio" aria-hidden="true" />
                <span><b>{t.name}</b><small>{t.hint}</small></span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="wq">
        <legend><span className="wq-n">2</span>Үл хөдлөх хөрөнгийн төрөл</legend>
        <div className="ptype-grid" role="radiogroup">
          {CAT_KEYS.map((k) => {
            const on = d.category === k;
            return (
              <button key={k} type="button" role="radio" aria-checked={on} className={`ptype ${on ? 'on' : ''}`}
                onClick={() => setD((x) => ({ ...x, category: k }))}>
                <span className="ico"><CatIcon cat={k} size={26} /></span>
                <b>{CATS[k].name}</b>
                <small>{CAT_HINTS[k]}</small>
                {on && <span className="check" aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="wiz-summary" aria-live="polite">
        Таны сонголт: <b>{CATS[d.category].name}</b> — <b>{d.dealType === 'rent' ? 'түрээслүүлнэ' : 'зарна'}</b>
      </div>
    </>
  );
}

/* ---------- 2. details ---------- */
/* Validation for step 2. Errors block "Дараах"; warnings only ask the user to double-check (a typo in the price is
   the most common mistake: per-m² far outside what Ulaanbaatar sees). Ranges match what createListing keeps, so a
   value is never silently dropped on save. */
type DetailKey = 'title' | 'price' | 'paymentTerms' | FieldKey;
type Issues = Partial<Record<DetailKey, string>>;
const THIS_YEAR = new Date().getFullYear();
const TITLE_MIN = 10;
// [min, max, whole number?] for the numeric fields
const RANGES: Partial<Record<FieldKey, [number, number, boolean]>> = {
  area: [1, 10_000_000, false], rooms: [1, 50, true], floor: [-3, 200, true], buildingFloors: [1, 200, true],
  yearInUse: [1900, THIS_YEAR + 5, true], balconies: [0, 20, true], windowCount: [0, 200, true],
};

function detailIssues(d: Draft): { errors: Issues; warnings: Issues } {
  const errors: Issues = {}, warnings: Issues = {};
  const rent = d.dealType === 'rent';
  const fields = FIELDS_BY_CAT[d.category];
  const val = (k: FieldKey) => (fields.includes(k) ? (d.fields[k] ?? '').trim() : '');

  const title = d.title.trim();
  if (!title) errors.title = 'Гарчиг оруулна уу.';
  else if (title.length < TITLE_MIN) errors.title = `Гарчиг хамгийн багадаа ${TITLE_MIN} тэмдэгт байна (одоо ${title.length}). Байршил, өрөө, талбайг дурдвал зүгээр.`;
  else if (!/\p{L}{2}/u.test(title)) errors.title = 'Гарчигт тоо биш, үг бичнэ үү.';

  const price = Number(d.price);
  if (!d.price.trim()) errors.price = 'Үнэ оруулна уу.';
  else if (!Number.isInteger(price) || price <= 0) errors.price = 'Үнийг төгрөгөөр, бүхэл тоогоор оруулна уу.';
  else if (price < (rent ? 10_000 : 100_000)) errors.price = rent ? 'Сарын түрээс хамгийн багадаа 10 000₮.' : 'Үнэ хэт бага байна. Бүтэн дүнгээр оруулна уу (жишээ нь 320000000).';
  else if (price > 1e13) errors.price = 'Үнэ хэт их байна.';

  for (const k of fields) {
    const raw = val(k), range = RANGES[k];
    if (!raw) { if (FIELD_DEFS[k].req) errors[k] = `${FIELD_DEFS[k].label.replace(/ \(.*\)/, '')} оруулна уу.`; continue; }
    if (!range) continue;
    const [min, max, int] = range, n = Number(raw);
    if (!Number.isFinite(n) || (int && !Number.isInteger(n)) || n < min || n > max)
      errors[k] = k === 'yearInUse' ? `${min}–${max} оны хооронд оруулна уу.` : `${min}–${max.toLocaleString('mn-MN')} хооронд ${int ? 'бүхэл ' : ''}тоо оруулна уу.`;
  }
  const floor = Number(val('floor')), bf = Number(val('buildingFloors'));
  if (val('floor') && val('buildingFloors') && !errors.floor && !errors.buildingFloors && floor > bf)
    errors.floor = `Барилга ${bf} давхар тул ${bf}-аас дээш байж болохгүй.`;

  if (!rent && d.paymentTerms.length === 0) errors.paymentTerms = 'Дор хаяж нэг төлбөрийн нөхцөл сонгоно уу.';

  // sanity check on price per m² (land and warehouses vary too much to judge)
  const area = Number(val('area'));
  if (!errors.price && !errors.area && area > 0 && price > 0 && d.category !== 'land' && d.category !== 'warehouse') {
    const ppm = price / area;
    const [lo, hi] = rent ? [3_000, 300_000] : [500_000, 30_000_000];
    if (ppm < lo || ppm > hi)
      warnings.price = `м² тутамд ${fmtFull(ppm)} гарч байна — ${ppm < lo ? 'хэт бага' : 'хэт өндөр'}. Үнэ, талбайгаа зөв оруулсан эсэхээ шалгана уу.`;
  }
  if (!errors.area && d.category === 'apartment' && area > 1000) warnings.area = 'Орон сууцанд их талбай байна. Зөв эсэхийг шалгана уу.';
  return { errors, warnings };
}

/** Field wrapper: label, control, and the error (or warning) under it, linked for screen readers. */
function Field({ id, label, req, error, warning, children }: {
  id: string; label: string; req?: boolean; error?: string; warning?: string; children: React.ReactElement<Record<string, unknown>>;
}) {
  const msg = error || warning;
  return (
    <label className={`field ${error ? 'invalid' : warning ? 'warn' : ''}`}>
      <span>{label}{req && ' *'}</span>
      {cloneElement(children, { 'aria-invalid': !!error, 'aria-describedby': msg ? `${id}-msg` : undefined })}
      {msg && <small id={`${id}-msg`} className={error ? 'field-err' : 'field-warn'}>{msg}</small>}
    </label>
  );
}
const noExp = (e: React.KeyboardEvent<HTMLInputElement>) => { if (['e', 'E', '+'].includes(e.key)) e.preventDefault(); };

function StepDetails({ d, setD, tried }: StepProps) {
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const setField = (k: FieldKey, v: string) => setD((x) => ({ ...x, fields: { ...x.fields, [k]: v } }));
  // a field shows its error once the user has left it, or after they pressed "Дараах"
  const [touched, setTouched] = useState<Partial<Record<DetailKey, boolean>>>({});
  const touch = (k: DetailKey) => () => setTouched((t) => (t[k] ? t : { ...t, [k]: true }));
  const { errors, warnings } = detailIssues(d);
  const err = (k: DetailKey) => (tried || touched[k] ? errors[k] : undefined);
  const warn = (k: DetailKey) => (tried || touched[k] ? warnings[k] : undefined);
  const p = Number(d.price), a = Number(d.fields.area);
  return (
    <>
      <h2 className="mt-0">{CATS[d.category].name} — {d.dealType === 'rent' ? 'түрээслүүлнэ' : 'зарна'}</h2>
      <p className="muted small field-note">* тэмдэгтэй талбарыг заавал бөглөнө.</p>
      <Field id="title" label="Гарчиг" req error={err('title')}>
        <input type="text" maxLength={120} value={d.title} onChange={(e) => set('title', e.target.value)} onBlur={touch('title')}
          placeholder="Жишээ нь: Хан-Уул, 3 өрөө, 85м², шинэ байр" />
      </Field>
      <Field id="price" label={`Үнэ (₮)${d.dealType === 'rent' ? ' — сарын' : ''}`} req error={err('price')} warning={warn('price')}>
        <input type="number" inputMode="numeric" min={0} step={1} value={d.price} onChange={(e) => set('price', e.target.value)} onBlur={touch('price')}
          onKeyDown={noExp} placeholder="320000000" />
      </Field>
      {p > 0 && <div className="muted small field-note">{fmtPrice(p)}{a > 0 && ` · м² — ${fmtFull(p / a)}`}</div>}
      <div className="grid-fields">
        {FIELDS_BY_CAT[d.category].map((k) => {
          const def = FIELD_DEFS[k], range = RANGES[k];
          return (
            <Field key={k} id={k} label={def.label} req={def.req} error={err(k)} warning={warn(k)}>
              {def.type === 'select'
                ? <select value={d.fields[k] || ''} onChange={(e) => setField(k, e.target.value)}><option value="">—</option>{def.options!.map((o) => <option key={o}>{o}</option>)}</select>
                : <input type="number" inputMode={range?.[2] ? 'numeric' : 'decimal'} min={range?.[0]} max={range?.[1]} step={range?.[2] ? 1 : 'any'}
                    value={d.fields[k] || ''} onChange={(e) => setField(k, e.target.value)} onBlur={touch(k)} onKeyDown={noExp} />}
            </Field>
          );
        })}
      </div>
      <div className="row-wrap-lg">
        {d.category !== 'land' && <label className="check"><input type="checkbox" checked={d.garage} onChange={(e) => set('garage', e.target.checked)} /> Гаражтай</label>}
        <label className="check"><input type="checkbox" checked={d.leasing} onChange={(e) => set('leasing', e.target.checked)} /> Лизингээр авах боломжтой</label>
      </div>
      <div className={`field ${err('paymentTerms') ? 'invalid' : ''} mb-4`} role="group" aria-labelledby="pay-lbl">
        <span id="pay-lbl" className="muted small fw-600">Төлбөрийн нөхцөл{d.dealType === 'sale' && ' *'}</span>
        <div className="chips mt-1">
          {PAY_TERMS.map((t) => {
            const on = d.paymentTerms.includes(t);
            return (
              <button type="button" key={t} className={`chip ${on ? 'on' : ''}`} aria-pressed={on}
                onClick={() => { touch('paymentTerms')(); set('paymentTerms', on ? d.paymentTerms.filter((x) => x !== t) : [...d.paymentTerms, t]); }}>{t}</button>
            );
          })}
        </div>
        {err('paymentTerms') && <small className="field-err">{err('paymentTerms')}</small>}
      </div>
      <label className="field"><span>Дэлгэрэнгүй тайлбар</span>
        <textarea maxLength={5000} value={d.description} onChange={(e) => set('description', e.target.value)} placeholder="Байрны онцлог, ойр орчмын үйлчилгээ, засвар..." />
        <small className="muted text-right-block">{d.description.length} / 5000</small></label>
    </>
  );
}

/* ---------- 3. photos ---------- */
function StepPhotos({ d, setD, toast, user }: StepProps) {
  const updPhoto = (key: string, patch: Partial<DraftPhoto> | null) =>
    setD((x) => ({ ...x, photos: patch ? x.photos.map((p) => (p.key === key ? { ...p, ...patch } : p)) : x.photos.filter((p) => p.key !== key) }));
  const removePhoto = (p: DraftPhoto) => {
    if (p.localId) dropLocal(p.localId);
    if (isBlobUrl(p.preview)) URL.revokeObjectURL(p.preview);
    updPhoto(p.key, null);
  };
  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files || [])].slice(0, 20 - d.photos.length);
    e.target.value = '';
    const entries = files.map((f) => ({ file: f, photo: { key: uid(), preview: URL.createObjectURL(f), processing: true } as DraftPhoto }));
    setD((x) => ({ ...x, photos: [...x.photos, ...entries.map((en) => en.photo)] }));
    // resized on this device and kept here; uploaded to R2 only when the listing is submitted
    for (const { file, photo } of entries) {
      try {
        const r = await resizeImage(file, 1600);
        const url = URL.createObjectURL(r.blob);
        URL.revokeObjectURL(photo.preview);
        updPhoto(photo.key, { src: url, preview: url, width: r.width, height: r.height, processing: false, localId: keepLocal(user.id, r.blob) });
      } catch (err) { toast((err as Error).message); URL.revokeObjectURL(photo.preview); updPhoto(photo.key, null); }
    }
  }
  const makeCover = (i: number) => setD((x) => { const ph = [...x.photos]; const [p] = ph.splice(i, 1); return { ...x, photos: [p, ...ph] }; });
  return (
    <>
      <h2 className="mt-0">Зураг <span className="muted small">({d.photos.length}/20)</span></h2>
      <label className="dropzone">
        <input type="file" accept="image/*" multiple onChange={onFiles} />
        <Icon name="camera" size={28} className="icon-feature" /><b>Зураг сонгох</b><div className="muted small">Ихдээ 20 зураг. Эхний зураг нүүр зураг болно.</div>
      </label>
      <div className="photo-grid">
        {d.photos.map((p, i) => (
          <div className="ph" key={p.key}>
            <img src={p.src || p.preview || undefined} alt="" className={p.processing ? 'is-uploading' : undefined} />
            {i === 0 ? <span className="badge cover">Нүүр</span>
              : <button className="btn btn-sm cover btn-xs" onClick={() => makeCover(i)}>Нүүр болгох</button>}
            <button className="x" aria-label="Устгах" onClick={() => removePhoto(p)}>×</button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- 4. 360° tour ---------- */
function StepTour({ d, setD, toast, user }: StepProps) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'A' | 'B'>('B');
  const [fov, setFov] = useState(65);
  const [editId, setEditId] = useState<string | null>(null);
  const rooms = d.tour.rooms;

  const updRoom = (id: string, patch: Partial<DraftRoom>) =>
    setD((x) => ({ ...x, tour: { ...x.tour, rooms: x.tour.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) } }));
  const addRoom = (room: DraftRoom) =>
    setD((x) => ({ ...x, tour: { startRoomId: x.tour.startRoomId ?? room.id, rooms: [...x.tour.rooms, room] } }));
  const removeRoom = (id: string) => {
    const gone = rooms.find((r) => r.id === id);
    if (gone?.localId) dropLocal(gone.localId);
    if (isBlobUrl(gone?.panorama?.src)) URL.revokeObjectURL(gone!.panorama!.src);
    setD((x) => {
      const left = x.tour.rooms.filter((r) => r.id !== id).map((r) => ({ ...r, hotspots: r.hotspots.filter((h) => h.targetRoomId !== id) }));
      return { ...x, tour: { startRoomId: x.tour.startRoomId === id ? left[0]?.id ?? null : x.tour.startRoomId, rooms: left } };
    });
    if (editId === id) setEditId(null);
  };
  const takeName = () => { const n = name.trim() || `Өрөө ${rooms.length + 1}`; setName(''); return n; };

  async function addModeA(file?: File) {
    if (!file) return;
    // full 360° sphere (2:1) or a wide phone panorama (iPhone Pano), see lib/pano.ts
    const id = uid();
    try {
      const r = await preparePano(file);
      // shown from this device; uploaded only when the listing is submitted
      addRoom({ id, name: takeName(), source: 'upload360', status: 'ready', hotspots: [], startYaw: 0, haov: r.haov, vaov: r.vaov,
        panorama: { src: URL.createObjectURL(r.blob), width: r.width, height: r.height }, localId: keepLocal(user.id, r.blob) });
      setEditId(id);
      if (r.haov) toast(`Панорама: ойролцоогоор ${r.haov}° хамарсан гэж тооцлоо. Буруу бол "Засах" хэсэгт тохируулна уу.`);
    } catch (err) {
      if (!(err instanceof PanoError)) updRoom(id, { status: 'failed', error: (err as Error).message });
      toast((err as Error).message);
    }
  }

  async function runStitch(room: DraftRoom) {
    const id = room.id;
    updRoom(id, { status: 'processing', progress: 0, progressText: 'Эхэлж байна', error: undefined });
    try {
      const res = await stitch(room.files!, {
        fov: room.fov,
        onProgress: (p, t) => updRoom(id, { progress: p, progressText: t }),
      });
      const blob = await canvasToBlob(res.canvas, 'image/jpeg', 0.9);
      // originals are not kept after stitching; the panorama stays on this device until the listing is submitted
      updRoom(id, { panorama: { src: URL.createObjectURL(blob), width: res.width, height: res.height }, status: 'ready', files: undefined,
        localId: keepLocal(user.id, blob) });
      setEditId(id);
      toast(`360° бэлэн боллоо (${res.photos} зураг, линз ≈ ${Math.round(res.lensDeg)}°)`);
    } catch (err) {
      updRoom(id, { status: 'failed', error: (err as Error).message || String(err) });
    }
  }
  function addModeB(files: File[]) {
    if (!files.length) return;
    const room: DraftRoom = { id: uid(), name: takeName(), source: 'stitched', status: 'processing', hotspots: [], startYaw: 0, files, photoCount: files.length, fov };
    addRoom(room);
    runStitch(room);
  }
  async function demoCapture(e: React.MouseEvent) {
    e.preventDefault();
    try {
      const files = await Promise.all(Array.from({ length: 12 }, async (_, i) => {
        const n = `IMG_${String(i + 1).padStart(2, '0')}.png`;
        const b = await (await fetch(`/mock/demo-capture/${n}`)).blob();
        return new File([b], n, { type: 'image/png' });
      }));
      const room: DraftRoom = { id: uid(), name: name.trim() || 'Зочны өрөө (туршилт)', source: 'stitched', status: 'processing', hotspots: [], startYaw: 0, files, photoCount: 12, fov: 65 };
      setName('');
      addRoom(room);
      runStitch(room);
    } catch (err) { toast((err as Error).message); }
  }

  const editing = rooms.find((r) => r.id === editId && r.status === 'ready');
  return (
    <>
      <h2 className="mt-0">360° аялал <span className="muted small">(заавал биш)</span></h2>
      <p className="muted">Өрөө бүрт 360° зураг нэмээд, өрөөнүүдийг сумаар холбоно. Энгийн утасны зургуудаас сайт өөрөө 360° болгоно.</p>
      {!rooms.length && <div className="muted small mb-3">Одоогоор өрөө нэмээгүй байна.</div>}
      {rooms.map((r) => (
        <div className="room-card" key={r.id}>
          {r.panorama ? <img src={r.panorama.src} alt="" /> : <div className="room-thumb-ph" />}
          <div className="grow">
            <b>{r.name}</b> <span className={`status ${r.status}`}>{{ ready: 'Бэлэн', processing: 'Боловсруулж байна', failed: 'Амжилтгүй' }[r.status]}</span>
            <div className="muted small">
              {r.vaov ? `Панорама · ${r.haov}°` : { upload360: 'Бэлэн 360°', stitched: 'Зургуудаас холбосон', ai: 'AI', splat: '3D' }[r.source]}
              {r.photoCount ? ` · ${r.photoCount} зураг` : ''}{r.hotspots.length ? ` · ${r.hotspots.length} сум` : ''}
            </div>
            {r.status === 'processing' && <>
              <div className="progress"><div style={{ width: `${Math.round((r.progress || 0) * 100)}%` }} /></div>
              <div className="muted small">{r.progressText}</div>
            </>}
            {r.status === 'failed' && <div className="error-box mt-2">
              {r.error}{'\n\n'}Дахин зураг авах, эсвэл &quot;Бэлэн 360° зураг&quot; аргыг ашиглах, эсвэл энгийн зургийн цомгоор үлдээж болно.</div>}
          </div>
          <div className="row-wrap">
            {r.status === 'ready' && <>
              <label className="check small"><input type="radio" name="startRoom" checked={d.tour.startRoomId === r.id}
                onChange={() => setD((x) => ({ ...x, tour: { ...x.tour, startRoomId: r.id } }))} /> Эхлэх өрөө</label>
              <button className={`btn btn-sm ${editId === r.id ? 'btn-primary' : ''}`} onClick={() => setEditId(editId === r.id ? null : r.id)}>Засах / сум нэмэх</button>
            </>}
            {r.status === 'failed' && r.files && <button className="btn btn-sm" onClick={() => runStitch(r)}>Дахин оролдох</button>}
            <button className="btn btn-sm btn-danger" onClick={() => removeRoom(r.id)}>Устгах</button>
          </div>
        </div>
      ))}

      {editing && (
        <RoomEditor key={editing.id} room={editing} others={rooms.filter((r) => r.id !== editing.id && r.status === 'ready')}
          onChange={(patch) => updRoom(editing.id, patch)} onClose={() => setEditId(null)} toast={toast} />
      )}

      <div className="panel panel-sub">
        <h3 className="mt-0">+ Өрөө нэмэх</h3>
        <div className="row2">
          <label className="field"><span>Өрөөний нэр</span>
            <input type="text" list="roomNames" value={name} onChange={(e) => setName(e.target.value)} placeholder="Зочны өрөө" />
            <datalist id="roomNames">{ROOM_NAMES.map((n) => <option key={n} value={n} />)}</datalist></label>
          <label className="field"><span>Арга</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as 'A' | 'B')}>
              <option value="B">Энгийн зургуудаас холбох (8–16 зураг)</option><option value="A">Бэлэн 360° эсвэл утасны панорама</option>
            </select></label>
        </div>
        {mode === 'A' ? (
          <label className="dropzone">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { addModeA(e.target.files?.[0]); e.target.value = ''; }} />
            <Icon name="globe" size={26} className="icon-feature" /><b>360° зураг эсвэл панорама сонгох</b><div className="muted small">360° камерын зураг (өргөн = 2 × өндөр), эсвэл iPhone/Android-ын «Pano» горимоор авсан өргөн зураг</div>
          </label>
        ) : (
          <>
            <CaptureGuide />
            <div className="row2 mt-3">
              <label className="field"><span>Камерын линз</span>
                <select value={fov} onChange={(e) => setFov(Number(e.target.value))}>
                  <option value={65}>Үндсэн камер (~65°, хэвтээ)</option><option value={50}>Үндсэн камер, босоо (~50°)</option><option value={100}>Өргөн өнцөг / ultra-wide (~100°)</option>
                </select></label>
              <div />
            </div>
            <label className="dropzone">
              <input type="file" accept="image/*" multiple onChange={(e) => { addModeB([...(e.target.files || [])]); e.target.value = ''; }} />
              <Icon name="layers" size={26} className="icon-feature" /><b>Давхацсан зургуудаа сонгох</b><div className="muted small">Авсан дарааллаар нь (файлын нэрээр эрэмбэлнэ)</div>
            </label>
            <p className="small"><a href="#" onClick={demoCapture}>Туршилтын 12 зургаар турших</a> <span className="muted">— сайт өөрөө зурсан өрөөний 12 давхацсан зураг</span></p>
          </>
        )}
      </div>
    </>
  );
}

function RoomEditor({ room, others, onChange, onClose, toast }: {
  room: DraftRoom; others: DraftRoom[]; onChange: (p: Partial<DraftRoom>) => void; onClose: () => void; toast: (m: string) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const viewer = useRef<PannellumViewer | null>(null);
  const yawRef = useRef(room.startYaw || 0);
  const [target, setTarget] = useState(others[0]?.id || '');
  const [picking, setPicking] = useState(false);
  const pickRef = useRef<{ picking: boolean; target: string; hotspots: Hotspot[]; others: DraftRoom[] }>({ picking, target, hotspots: room.hotspots, others });
  pickRef.current = { picking, target, hotspots: room.hotspots, others };
  const change = useRef(onChange);
  change.current = onChange;
  const hsKey = JSON.stringify(room.hotspots);

  useEffect(() => {
    let cancelled = false;
    let down: [number, number] | null = null;
    const node = el.current!;
    const md = (e: PointerEvent) => { down = [e.clientX, e.clientY]; };
    const mu = (e: PointerEvent) => {
      const { picking: on, target: t, hotspots, others: rooms } = pickRef.current;
      if (!on || !down || !viewer.current || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
      const [pitch, yaw] = viewer.current.mouseEventToCoords(e);
      const tr = rooms.find((o) => o.id === t);
      if (!tr) return;
      setPicking(false);
      change.current({ hotspots: [...hotspots, { pitch, yaw, targetRoomId: tr.id, label: tr.name }] });
    };
    node.addEventListener('pointerdown', md, true);
    node.addEventListener('pointerup', mu, true);
    getPannellum().then((pannellum) => {
      if (cancelled) return;
      viewer.current = pannellum.viewer(node, {
        type: 'equirectangular', panorama: room.panorama!.src, autoLoad: true, yaw: yawRef.current, hfov: 100, compass: false, ...panoView(room),
        hotSpots: room.hotspots.map((h) => ({ pitch: h.pitch, yaw: h.yaw, type: 'info', text: '→ ' + h.label })),
      });
    }).catch((e: Error) => toast(e.message));
    return () => {
      cancelled = true;
      node.removeEventListener('pointerdown', md, true);
      node.removeEventListener('pointerup', mu, true);
      try { if (viewer.current) { yawRef.current = viewer.current.getYaw(); viewer.current.destroy(); } } catch { /* ignore */ }
      viewer.current = null;
    };
  }, [room.panorama?.src, hsKey, room.haov]); // eslint-disable-line react-hooks/exhaustive-deps

  // Partial panorama: the seller corrects how far around the photo reaches. Arrows and the start
  // direction are stored in degrees, so they are rescaled to stay on the same spot in the image.
  const [haovDraft, setHaovDraft] = useState(room.haov ?? 360);
  const applyHaov = (h: number) => {
    if (!room.haov || !room.panorama || h === room.haov) return;
    const k = h / room.haov;
    yawRef.current *= k;
    onChange({
      haov: h, vaov: vaovFor(h, room.panorama.width, room.panorama.height), startYaw: Math.round(room.startYaw * k),
      hotspots: room.hotspots.map((x) => ({ ...x, yaw: x.yaw * k, pitch: x.pitch * k })),
    });
  };

  return (
    <div className="editor">
      <b>{room.name}</b> — чирж эргүүлж үзнэ үү
      <div className={`pano ${picking ? 'picking' : ''} mt-2`}><div ref={el} className="fill" /></div>
      {room.vaov && (
        <div className="pano-angle">
          <label htmlFor={`haov-${room.id}`}>Панорама хэр өргөн вэ? <b>{haovDraft === 360 ? 'Бүтэн тойрог (360°)' : `${haovDraft}°`}</b></label>
          <input id={`haov-${room.id}`} type="range" min={90} max={360} step={5} value={haovDraft}
            onChange={(e) => setHaovDraft(Number(e.target.value))}
            onPointerUp={() => applyHaov(haovDraft)} onKeyUp={() => applyHaov(haovDraft)} onBlur={() => applyHaov(haovDraft)} />
          <span className="muted small">Утасны панорама өнцгөө хадгалдаггүй тул ойролцоогоор тооцсон. Өрөөний зүйлс хэт өргөн эсвэл шахагдсан харагдвал тохируулна уу. Эхлэл, төгсгөл нь нийлж байвал 360°.</span>
        </div>
      )}
      <div className="editor-tools">
        <button className="btn btn-sm" onClick={() => { const y = Math.round(viewer.current?.getYaw() ?? 0); onChange({ startYaw: y }); toast(`Эхлэх чиглэл: ${y}°`); }}><Icon name="compass" /> Одоогийн чиглэлийг эхлэл болгох</button>
        {others.length ? <>
          <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Сум хаашаа">
            {others.map((o) => <option key={o.id} value={o.id}>→ {o.name}</option>)}
          </select>
          <button className="btn btn-sm btn-primary" onClick={() => setPicking(true)}><Icon name="plus" /> Сум нэмэх</button>
        </> : <span className="muted small">Сум нэмэхийн тулд өөр өрөө нэмнэ үү.</span>}
        <button className="btn btn-sm ml-auto" onClick={onClose}>Хаах</button>
      </div>
      {picking && <div className="muted small">Зураг дээр хаалга эсвэл гарц руу дарж сумыг байрлуулна уу.</div>}
      <ul className="hs-list">
        {room.hotspots.map((h, i) => (
          <li key={i}>→ {h.label} <span className="muted small">(yaw {Math.round(h.yaw)}°, pitch {Math.round(h.pitch)}°)</span>
            <button className="btn btn-sm btn-danger" onClick={() => onChange({ hotspots: room.hotspots.filter((_, j) => j !== i) })}>Устгах</button></li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- 5. location ---------- */
function StepLocation({ d, setD }: StepProps) {
  const setLoc = (patch: Partial<Draft['location']>) => setD((x) => ({ ...x, location: { ...x.location, ...patch } }));
  return (
    <>
      <h2 className="mt-0">Байршил</h2>
      <div className="grid-fields">
        <label className="field"><span>Хот / аймаг</span><input type="text" value="Улаанбаатар" disabled /></label>
        <label className="field"><span>Дүүрэг *</span>
          <select value={d.location.district} onChange={(e) => setLoc({ district: e.target.value })}><option value="">—</option>{DISTRICTS.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="field"><span>Хороо</span><input type="text" value={d.location.khoroo} onChange={(e) => setLoc({ khoroo: e.target.value })} placeholder="11-р хороо" /></label>
      </div>
      <label className="field"><span>Хаяг, байрны нэр</span>
        <input type="text" value={d.location.address} onChange={(e) => setLoc({ address: e.target.value })} placeholder="Жишээ нь: River Garden, 305-р байр" /></label>
      <p className="muted small">Газрын зураг дээр дарж байршлаа тэмдэглэнэ үү. Нийтэд ойролцоо тойргоор харагдана.</p>
      <LocationPicker value={d.location} center={CENTERS[d.location.district] || null} onPick={(lat, lng) => setLoc({ lat, lng })} />
    </>
  );
}

/* ---------- 6. contact + preview ---------- */
function StepContact({ d, setD, user }: StepProps) {
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const num = (k: FieldKey) => Number(d.fields[k]) || undefined;
  const preview = {
    id: 'preview', title: d.title || '(гарчиггүй)', price: Number(d.price) || 0, dealType: d.dealType, category: d.category,
    rooms: num('rooms'), area: num('area'), floor: num('floor'), buildingFloors: num('buildingFloors'),
    photos: d.photos.filter((p) => p.src).map((p) => ({ src: p.src!, width: p.width || 0, height: p.height || 0 })),
    location: { district: d.location.district || '—', lat: 0, lng: 0 }, createdAt: new Date().toISOString(),
    tour: { startRoomId: null, rooms: d.tour.rooms }, hasTour: d.tour.rooms.some((r) => r.status === 'ready'),
    promo: d.placement === 'top' ? 2 : d.placement === 'vip' ? 1 : 0,
  };
  return (
    <>
      <h2 className="mt-0">Холбоо барих ба урьдчилан харах</h2>
      <div className="grid-260">
        <div>
          <label className="field"><span>Нэр *</span><input type="text" maxLength={60} value={d.sellerName} onChange={(e) => set('sellerName', e.target.value)} /></label>
          <label className="field"><span>Утасны дугаар *</span><input type="tel" maxLength={11} placeholder="8 оронтой" value={d.sellerPhone} onChange={(e) => set('sellerPhone', e.target.value)} /></label>
          {user.role === 'admin' ? (
            <label className="field"><span>Зар оруулагч</span>
              <select value={d.sellerType} onChange={(e) => set('sellerType', e.target.value as SellerType)}><option value="agent">Агент</option><option value="owner">Эзэмшигч</option></select></label>
          ) : <p className="muted small">Зар &quot;Агент&quot; гэж харагдана. Нэр, утсыг таны бүртгэлээс бөглөсөн; энэ зарт зориулж өөрчилж болно.</p>}
          <p className="muted small">Утасны дугаар зар дээр шууд харагдана.</p>
        </div>
        <div><div className="muted small mb-2">Карт ингэж харагдана:</div><div className="maxw-300"><ListingCard l={preview} preview /></div></div>
      </div>
    </>
  );
}

/* ---------- 7. publish ---------- */
function StepPublish({ d, setD, user }: StepProps) {
  const ready = d.tour.rooms.filter((r) => r.status === 'ready').length;
  const isAdmin = user.role === 'admin';
  // agents: posting fee + the chosen placement; admins: free. The server computes the real amount (src/pricing.ts).
  const extra = PLACEMENTS[d.placement].price;
  const total = POSTING_FEE + extra;
  return (
    <>
      <h2 className="mt-0">Нийтлэх</h2>
      <div className="placements">
        {(Object.keys(PLACEMENTS) as Placement[]).map((k) => (
          <button key={k} className={`tile ${d.placement === k ? 'on' : ''}`} onClick={() => setD((x) => ({ ...x, placement: k }))}>
            <b>{PLACEMENTS[k].name}</b>
            {isAdmin ? 'Төлбөргүй' : PLACEMENTS[k].price ? `+${fmtFull(PLACEMENTS[k].price)}` : 'Нэмэлт төлбөргүй'}
            <div className="muted small">{PLACEMENTS[k].note}</div>
          </button>
        ))}
      </div>
      <p>Зураг: <b>{d.photos.length}</b> · 360° өрөө: <b>{ready}</b></p>
      {isAdmin ? (
        <p className="ok-box">Админы зар төлбөргүй бөгөөд шууд нийтлэгдэнэ.</p>
      ) : (
        <div className="price-box">
          <dl className="pay-items">
            <div><dt>Зар байршуулах (30 хоног)</dt><dd>{fmtFull(POSTING_FEE)}</dd></div>
            {extra > 0 && <div><dt>{PLACEMENTS[d.placement].name} (7 хоног)</dt><dd>{fmtFull(extra)}</dd></div>}
            <div className="pay-total"><dt>Нийт</dt><dd>{fmtFull(total)}</dd></div>
          </dl>
          <p className="muted small mb-0">Дараагийн алхамд QPay-ээр (банкны апп, QR) төлнө. Төлбөр орсны дараа админ шалгаж баталмагц зар нийтлэгдэнэ; VIP/Онцгой-ийн 7 хоног тэр үеэс эхэлнэ.</p>
        </div>
      )}
    </>
  );
}
