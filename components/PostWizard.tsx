'use client';
import Link from 'next/link';
import { cloneElement, useEffect, useRef, useState } from 'react';
import type { Category, DealType, Hotspot, Placement, SellerType, TourRoom, User } from '@/lib/types';
import {
  CATS, CAT_KEYS, CENTERS, DISTRICTS, FIELD_DEFS, FIELDS_BY_CAT, PAY_TERMS, PLACEMENTS, ROOM_NAMES, type FieldKey,
} from '@/lib/constants';
import { fmtFull, fmtPrice } from '@/lib/format';
import { createListing } from '@/lib/mock/api';
import { useAuth } from './Auth';
import { canvasToBlob, resizeImage, upload } from '@/lib/images';
import { getPannellum, type PannellumViewer } from '@/lib/pannellum';
import { stitch } from '@/lib/stitch';
import ListingCard from './ListingCard';
import CatIcon from './CatIcon';
import CaptureGuide from './CaptureGuide';
import { LocationPicker } from './Maps';
import { useToast } from './Toast';

/* ---------- draft model ---------- */
type DraftPhoto = { key: string; preview: string; src?: string; width?: number; height?: number; uploading: boolean };
type DraftRoom = TourRoom & { files?: File[]; fov?: number; photoCount?: number; progress?: number; progressText?: string };
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
// Keeps an unfinished draft while the user browses other pages (until a full reload),
// but never hands one user's draft to another.
let draftCache: { userId: string; draft: Draft } | null = null;

const STEP_NAMES = ['Ангилал', 'Мэдээлэл', 'Зураг', '360° аялал', 'Байршил', 'Холбоо барих', 'Нийтлэх'];
const uid = () => Math.random().toString(36).slice(2, 8);

type SetDraft = React.Dispatch<React.SetStateAction<Draft>>;

export default function PostWizard() {
  const { user } = useAuth();
  return user ? <Wizard user={user} /> : null;
}

function Wizard({ user }: { user: User }) {
  const toast = useToast();
  const [d, setD] = useState<Draft>(() => (draftCache?.userId === user.id ? draftCache.draft : newDraft(user)));
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; status: string } | null>(null);
  const [tried, setTried] = useState<Record<number, boolean>>({}); // steps where "Дараах" was pressed: show every error
  useEffect(() => { draftCache = { userId: user.id, draft: d }; }, [d, user.id]);

  function validate(s: number): string | null {
    if (s === 1) {
      const msgs = Object.values(detailIssues(d).errors);
      if (msgs.length === 1) return msgs[0]!;
      if (msgs.length) return `${msgs.length} талбарт алдаа байна. Улаанаар тэмдэглэсэн хэсгүүдийг засна уу.`;
    }
    if (s === 2 && d.photos.some((p) => p.uploading)) return 'Зургууд илгээгдэж дуусаагүй байна.';
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
  const go = (s: number) => { setError(''); setStep(Math.max(0, Math.min(STEP_NAMES.length - 1, s))); window.scrollTo(0, 0); };
  // on a failed step, mark it tried and move focus to the first invalid field so the user sees what to fix
  const fail = (s: number, e: string) => {
    setTried((t) => ({ ...t, [s]: true }));
    setError(e);
    setTimeout(() => document.querySelector<HTMLElement>('.wizard [aria-invalid="true"]')?.focus(), 0);
  };
  const next = () => { const e = validate(step); if (e) fail(step, e); else go(step + 1); };

  async function publish() {
    for (let s = 1; s <= 5; s++) { const e = validate(s); if (e) { go(s); fail(s, e); return; } }
    setBusy(true);
    const body = {
      dealType: d.dealType, category: d.category, title: d.title, price: d.price, description: d.description,
      ...d.fields, garage: d.garage, leasing: d.leasing, paymentTerms: d.paymentTerms,
      photos: d.photos.filter((p) => p.src).map((p) => ({ src: p.src, width: p.width, height: p.height })),
      tour: {
        startRoomId: d.tour.startRoomId,
        rooms: d.tour.rooms.filter((r) => r.status === 'ready').map((r) => ({ id: r.id, name: r.name, source: r.source, panorama: r.panorama, startYaw: r.startYaw, hotspots: r.hotspots })),
      },
      location: d.location, sellerName: d.sellerName, sellerPhone: d.sellerPhone, sellerType: d.sellerType, placement: d.placement,
    };
    try {
      const res = await createListing(body);
      draftCache = null;
      setDone(res);
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }

  if (done) {
    const live = done.status === 'active';
    return (
      <div className="panel" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 44 }}>✅</div><h1>{live ? 'Зар нийтлэгдлээ' : 'Зар илгээгдлээ'}</h1>
        <p>Зарын дугаар: <b>{done.id}</b>. {live ? 'Нийтэд харагдаж байна.' : 'Админ шалгаж баталсны дараа нийтэд харагдана.'}</p>
        <p>
          {live && <><Link className="btn btn-primary" href={`/listing/${done.id}`}>Зарыг харах</Link>{' '}</>}
          <Link className={`btn ${live ? '' : 'btn-primary'}`} href="/my">Миний зар</Link>
          {user.role === 'admin' && <>{' '}<Link className="btn" href="/admin">Админ самбар</Link></>}
        </p>
        <button className="btn btn-sm" onClick={() => { setD(newDraft(user)); setDone(null); setStep(0); }}>Шинэ зар нэмэх</button>
      </div>
    );
  }

  const Step = [StepCategory, StepDetails, StepPhotos, StepTour, StepLocation, StepContact, StepPublish][step];
  return (
    <div className="wizard">
      <div className="wiz-head">
        <h1>Зар нэмэх</h1>
        <span className="wiz-count">Алхам {step + 1} / {STEP_NAMES.length}</span>
      </div>
      <ol className="wsteps" aria-label="Зар нэмэх алхамууд">
        {STEP_NAMES.map((n, i) => {
          const state = i === step ? 'on' : i < step ? 'done' : '';
          return (
            <li key={n} className={state}>
              <button type="button" aria-current={i === step ? 'step' : undefined}
                onClick={() => { if (i <= step) go(i); else if (i === step + 1) next(); }}
                disabled={i > step + 1} title={i > step + 1 ? 'Өмнөх алхмуудаа эхлээд бөглөнө үү' : undefined}>
                <span className="dot">{i < step ? '✓' : i + 1}</span>
                <span className="lbl">{n}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="panel"><Step d={d} setD={setD} toast={toast} user={user} tried={!!tried[step]} /></div>
      {error && !(step === 1 && !validate(1)) && <div className="error-box" role="alert" style={{ marginTop: 12 }}>{error}</div>}
      <div className="wizard-nav">
        <button className="btn" disabled={step === 0} onClick={() => go(step - 1)}>‹ Буцах</button>
        {step < STEP_NAMES.length - 1
          ? <button className="btn btn-primary" onClick={next}>Дараах ›</button>
          : <button className="btn btn-accent" disabled={busy} onClick={publish}>{busy ? 'Илгээж байна…' : 'Нийтлэх'}</button>}
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
      <h2 style={{ marginTop: 0 }}>{CATS[d.category].name} — {d.dealType === 'rent' ? 'түрээслүүлнэ' : 'зарна'}</h2>
      <p className="muted small" style={{ margin: '-6px 0 16px' }}>* тэмдэгтэй талбарыг заавал бөглөнө.</p>
      <Field id="title" label="Гарчиг" req error={err('title')}>
        <input type="text" maxLength={120} value={d.title} onChange={(e) => set('title', e.target.value)} onBlur={touch('title')}
          placeholder="Жишээ нь: Хан-Уул, 3 өрөө, 85м², шинэ байр" />
      </Field>
      <Field id="price" label={`Үнэ (₮)${d.dealType === 'rent' ? ' — сарын' : ''}`} req error={err('price')} warning={warn('price')}>
        <input type="number" inputMode="numeric" min={0} step={1} value={d.price} onChange={(e) => set('price', e.target.value)} onBlur={touch('price')}
          onKeyDown={noExp} placeholder="320000000" />
      </Field>
      {p > 0 && <div className="muted small" style={{ margin: '-6px 0 12px' }}>{fmtPrice(p)}{a > 0 && ` · м² — ${fmtFull(p / a)}`}</div>}
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
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', margin: '6px 0 12px' }}>
        {d.category !== 'land' && <label className="check"><input type="checkbox" checked={d.garage} onChange={(e) => set('garage', e.target.checked)} /> Гаражтай</label>}
        <label className="check"><input type="checkbox" checked={d.leasing} onChange={(e) => set('leasing', e.target.checked)} /> Лизингээр авах боломжтой</label>
      </div>
      <div className={`field ${err('paymentTerms') ? 'invalid' : ''}`} role="group" aria-labelledby="pay-lbl" style={{ marginBottom: 16 }}>
        <span id="pay-lbl" className="muted small" style={{ fontWeight: 600 }}>Төлбөрийн нөхцөл{d.dealType === 'sale' && ' *'}</span>
        <div className="chips" style={{ marginTop: 4 }}>
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
        <small className="muted" style={{ display: 'block', textAlign: 'right' }}>{d.description.length} / 5000</small></label>
    </>
  );
}

/* ---------- 3. photos ---------- */
function StepPhotos({ d, setD, toast }: StepProps) {
  const updPhoto = (key: string, patch: Partial<DraftPhoto> | null) =>
    setD((x) => ({ ...x, photos: patch ? x.photos.map((p) => (p.key === key ? { ...p, ...patch } : p)) : x.photos.filter((p) => p.key !== key) }));
  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files || [])].slice(0, 20 - d.photos.length);
    e.target.value = '';
    const entries = files.map((f) => ({ file: f, photo: { key: uid(), preview: URL.createObjectURL(f), uploading: true } as DraftPhoto }));
    setD((x) => ({ ...x, photos: [...x.photos, ...entries.map((en) => en.photo)] }));
    for (const { file, photo } of entries) {
      try {
        const r = await resizeImage(file, 1600);
        updPhoto(photo.key, { src: await upload(r.blob), width: r.width, height: r.height, uploading: false });
      } catch (err) { toast((err as Error).message); updPhoto(photo.key, null); }
    }
  }
  const makeCover = (i: number) => setD((x) => { const ph = [...x.photos]; const [p] = ph.splice(i, 1); return { ...x, photos: [p, ...ph] }; });
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Зураг <span className="muted small">({d.photos.length}/20)</span></h2>
      <label className="dropzone">
        <input type="file" accept="image/*" multiple onChange={onFiles} />
        <div style={{ fontSize: 28 }}>📷</div><b>Зураг сонгох</b><div className="muted small">Ихдээ 20 зураг. Эхний зураг нүүр зураг болно.</div>
      </label>
      <div className="photo-grid">
        {d.photos.map((p, i) => (
          <div className="ph" key={p.key}>
            <img src={p.src || p.preview} alt="" style={{ opacity: p.uploading ? 0.5 : 1 }} />
            {i === 0 ? <span className="badge cover">Нүүр</span>
              : <button className="btn btn-sm cover" style={{ padding: '1px 6px', fontSize: 11 }} onClick={() => makeCover(i)}>Нүүр болгох</button>}
            <button className="x" aria-label="Устгах" onClick={() => updPhoto(p.key, null)}>×</button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- 4. 360° tour ---------- */
function StepTour({ d, setD, toast }: StepProps) {
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
    setD((x) => {
      const left = x.tour.rooms.filter((r) => r.id !== id).map((r) => ({ ...r, hotspots: r.hotspots.filter((h) => h.targetRoomId !== id) }));
      return { ...x, tour: { startRoomId: x.tour.startRoomId === id ? left[0]?.id ?? null : x.tour.startRoomId, rooms: left } };
    });
    if (editId === id) setEditId(null);
  };
  const takeName = () => { const n = name.trim() || `Өрөө ${rooms.length + 1}`; setName(''); return n; };

  async function addModeA(file?: File) {
    if (!file) return;
    try {
      const r = await resizeImage(file, 6000);
      const ratio = r.origW / r.origH;
      if (ratio < 1.95 || ratio > 2.05) { toast(`Энэ зураг 360° (2:1) биш байна: ${r.origW}×${r.origH}. "Энгийн зургуудаас холбох" аргыг ашиглана уу.`); return; }
      const id = uid();
      addRoom({ id, name: takeName(), source: 'upload360', status: 'processing', progress: 0.5, progressText: 'Илгээж байна', hotspots: [], startYaw: 0 });
      const src = await upload(r.blob);
      updRoom(id, { panorama: { src, width: r.width, height: r.height }, status: 'ready' });
      setEditId(id);
    } catch (err) { toast((err as Error).message); }
  }

  async function runStitch(room: DraftRoom) {
    const id = room.id;
    updRoom(id, { status: 'processing', progress: 0, progressText: 'Эхэлж байна', error: undefined });
    try {
      const res = await stitch(room.files!, {
        fov: room.fov,
        onProgress: (p, t) => updRoom(id, { progress: p, progressText: t }),
      });
      updRoom(id, { progressText: 'Илгээж байна' });
      const blob = await canvasToBlob(res.canvas, 'image/jpeg', 0.9);
      const src = await upload(blob);
      // originals are not kept after stitching
      updRoom(id, { panorama: { src, width: res.width, height: res.height }, status: 'ready', files: undefined });
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
      <h2 style={{ marginTop: 0 }}>360° аялал <span className="muted small">(заавал биш)</span></h2>
      <p className="muted">Өрөө бүрт 360° зураг нэмээд, өрөөнүүдийг сумаар холбоно. Энгийн утасны зургуудаас сайт өөрөө 360° болгоно.</p>
      {!rooms.length && <div className="muted small" style={{ marginBottom: 10 }}>Одоогоор өрөө нэмээгүй байна.</div>}
      {rooms.map((r) => (
        <div className="room-card" key={r.id}>
          {r.panorama ? <img src={r.panorama.src} alt="" /> : <div style={{ width: 120, height: 60, borderRadius: 6, background: 'var(--surface-2)' }} />}
          <div className="grow">
            <b>{r.name}</b> <span className={`status ${r.status}`}>{{ ready: 'Бэлэн', processing: 'Боловсруулж байна', failed: 'Амжилтгүй' }[r.status]}</span>
            <div className="muted small">
              {{ upload360: 'Бэлэн 360°', stitched: 'Зургуудаас холбосон', ai: 'AI', splat: '3D' }[r.source]}
              {r.photoCount ? ` · ${r.photoCount} зураг` : ''}{r.hotspots.length ? ` · ${r.hotspots.length} сум` : ''}
            </div>
            {r.status === 'processing' && <>
              <div className="progress"><div style={{ width: `${Math.round((r.progress || 0) * 100)}%` }} /></div>
              <div className="muted small">{r.progressText}</div>
            </>}
            {r.status === 'failed' && <div className="error-box" style={{ marginTop: 6 }}>
              {r.error}{'\n\n'}Дахин зураг авах, эсвэл &quot;Бэлэн 360° зураг&quot; аргыг ашиглах, эсвэл энгийн зургийн цомгоор үлдээж болно.</div>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
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

      <div className="panel" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
        <h3 style={{ marginTop: 0 }}>+ Өрөө нэмэх</h3>
        <div className="row2">
          <label className="field"><span>Өрөөний нэр</span>
            <input type="text" list="roomNames" value={name} onChange={(e) => setName(e.target.value)} placeholder="Зочны өрөө" />
            <datalist id="roomNames">{ROOM_NAMES.map((n) => <option key={n} value={n} />)}</datalist></label>
          <label className="field"><span>Арга</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as 'A' | 'B')}>
              <option value="B">Энгийн зургуудаас холбох (8–16 зураг)</option><option value="A">Бэлэн 360° зураг (2:1)</option>
            </select></label>
        </div>
        {mode === 'A' ? (
          <label className="dropzone">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { addModeA(e.target.files?.[0]); e.target.value = ''; }} />
            <div style={{ fontSize: 24 }}>🌐</div><b>360° зураг сонгох</b><div className="muted small">Equirectangular, өргөн = 2 × өндөр (жишээ нь 6000×3000)</div>
          </label>
        ) : (
          <>
            <CaptureGuide />
            <div className="row2" style={{ marginTop: 12 }}>
              <label className="field"><span>Камерын линз</span>
                <select value={fov} onChange={(e) => setFov(Number(e.target.value))}>
                  <option value={65}>Үндсэн камер (~65°, хэвтээ)</option><option value={50}>Үндсэн камер, босоо (~50°)</option><option value={100}>Өргөн өнцөг / ultra-wide (~100°)</option>
                </select></label>
              <div />
            </div>
            <label className="dropzone">
              <input type="file" accept="image/*" multiple onChange={(e) => { addModeB([...(e.target.files || [])]); e.target.value = ''; }} />
              <div style={{ fontSize: 24 }}>🧩</div><b>Давхацсан зургуудаа сонгох</b><div className="muted small">Авсан дарааллаар нь (файлын нэрээр эрэмбэлнэ)</div>
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
        type: 'equirectangular', panorama: room.panorama!.src, autoLoad: true, yaw: yawRef.current, hfov: 100, compass: false,
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
  }, [room.panorama?.src, hsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="editor">
      <b>{room.name}</b> — чирж эргүүлж үзнэ үү
      <div className={`pano ${picking ? 'picking' : ''}`} style={{ marginTop: 8 }}><div ref={el} style={{ width: '100%', height: '100%' }} /></div>
      <div className="editor-tools">
        <button className="btn btn-sm" onClick={() => { const y = Math.round(viewer.current?.getYaw() ?? 0); onChange({ startYaw: y }); toast(`Эхлэх чиглэл: ${y}°`); }}>🧭 Одоогийн чиглэлийг эхлэл болгох</button>
        {others.length ? <>
          <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Сум хаашаа">
            {others.map((o) => <option key={o.id} value={o.id}>→ {o.name}</option>)}
          </select>
          <button className="btn btn-sm btn-primary" onClick={() => setPicking(true)}>➕ Сум нэмэх</button>
        </> : <span className="muted small">Сум нэмэхийн тулд өөр өрөө нэмнэ үү.</span>}
        <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={onClose}>Хаах</button>
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
      <h2 style={{ marginTop: 0 }}>Байршил</h2>
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
      <h2 style={{ marginTop: 0 }}>Холбоо барих ба урьдчилан харах</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
        <div>
          <label className="field"><span>Нэр *</span><input type="text" maxLength={60} value={d.sellerName} onChange={(e) => set('sellerName', e.target.value)} /></label>
          <label className="field"><span>Утасны дугаар *</span><input type="tel" maxLength={11} placeholder="8 оронтой" value={d.sellerPhone} onChange={(e) => set('sellerPhone', e.target.value)} /></label>
          {user.role === 'admin' ? (
            <label className="field"><span>Зар оруулагч</span>
              <select value={d.sellerType} onChange={(e) => set('sellerType', e.target.value as SellerType)}><option value="agent">Агент</option><option value="owner">Эзэмшигч</option></select></label>
          ) : <p className="muted small">Зар &quot;Агент&quot; гэж харагдана. Нэр, утсыг таны бүртгэлээс бөглөсөн; энэ зарт зориулж өөрчилж болно.</p>}
          <p className="muted small">Утасны дугаар зар дээр шууд харагдана.</p>
        </div>
        <div><div className="muted small" style={{ marginBottom: 6 }}>Карт ингэж харагдана:</div><div style={{ maxWidth: 300 }}><ListingCard l={preview} preview /></div></div>
      </div>
    </>
  );
}

/* ---------- 7. publish ---------- */
function StepPublish({ d, setD }: StepProps) {
  const ready = d.tour.rooms.filter((r) => r.status === 'ready').length;
  const tourFee = ready > 3 ? 10000 : 0;
  const total = PLACEMENTS[d.placement].price + tourFee;
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Нийтлэх</h2>
      <div className="placements">
        {(Object.keys(PLACEMENTS) as Placement[]).map((k) => (
          <button key={k} className={`tile ${d.placement === k ? 'on' : ''}`} onClick={() => setD((x) => ({ ...x, placement: k }))}>
            <b>{PLACEMENTS[k].name}</b>{PLACEMENTS[k].price ? fmtFull(PLACEMENTS[k].price) : 'Үнэгүй'}<div className="muted small">{PLACEMENTS[k].note}</div>
          </button>
        ))}
      </div>
      <p>Зураг: <b>{d.photos.filter((p) => p.src).length}</b> · 360° өрөө: <b>{ready}</b>{tourFee > 0 && ` (3-аас олон өрөө: +${fmtFull(tourFee)})`}</p>
      {total > 0 && <>
        <h3>Төлбөрийн арга</h3>
        <div className="chips">
          {[['qpay', 'QPay'], ['socialpay', 'SocialPay'], ['card', 'Банкны карт']].map(([k, n]) => (
            <button type="button" key={k} className={`chip ${d.payMethod === k ? 'on' : ''}`} onClick={() => setD((x) => ({ ...x, payMethod: k }))}>{n}</button>
          ))}
        </div>
        <p className="ok-box" style={{ marginTop: 10 }}>Нийт: <b>{fmtFull(total)}</b>. Энэ бол прототип — төлбөр жинхэнээр хийгдэхгүй, VIP/Онцгой шууд идэвхжинэ.</p>
      </>}
      <p className="muted small">Нийтэлсний дараа админ шалгаж баталсны дараа зар харагдана.</p>
    </>
  );
}
