'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SearchResult } from '@/lib/types';
import { CATS, CAT_KEYS, DISTRICTS } from '@/lib/constants';
import { searchListings, searchPins, type PinResult } from '@/lib/api/listings';
import { fmtFloor } from '@/lib/format';
import { store } from '@/lib/store';
import { Grid } from './ListingCard';
import { ResultsMap } from './Maps';
import PageLoader from '@/components/PageLoader';
import LoadError from '@/components/LoadError';

// Давхрын сонголт: подвал B3–B1, дараа нь 1–40 (сөрөг тоо дотооддоо подвалыг илэрхийлнэ).
const FLOORS = [-3, -2, -1, ...Array.from({ length: 40 }, (_, i) => i + 1)];
const SORTS: [string, string][] = [['new', 'Шинэ эхэндээ'], ['cheap', 'Хямд эхэндээ'], ['expensive', 'Үнэтэй эхэндээ'], ['ppm2', 'м² үнэ (бага)'], ['area', 'Талбай (их)']];
// "Нарийвчилсан" хэсэгт хамаарах параметрүүд (идэвхтэй тоог товчин дээр харуулна)
const ADV_KEYS = ['priceMin', 'priceMax', 'roomsMin', 'rooms', 'areaMin', 'areaMax', 'floor', 'notFirst', 'notLast',
  'yearMin', 'yearMax', 'posted', 'tour', 'leasing', 'garage'];
const DEALS: { key: '' | 'sale' | 'rent'; label: string }[] = [
  { key: '', label: 'Бүгд' }, { key: 'sale', label: 'Зарна' }, { key: 'rent', label: 'Түрээс' },
];

/** Хуудаслалтын товчнууд: 1 … 4 5 6 … 20 (эхний, сүүлийн, одоогийн хөрш). */
function pageList(page: number, pages: number): (number | '…')[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  // ганц алгасах хуудсыг "…" биш тоогоор нь харуулна
  if (keep.has(3) && !keep.has(2)) keep.add(2);
  if (keep.has(pages - 2) && !keep.has(pages - 1)) keep.add(pages - 1);
  const out: (number | '…')[] = [];
  let prev = 0;
  for (const n of [...keep].sort((a, b) => a - b)) { if (n - prev > 1) out.push('…'); out.push(n); prev = n; }
  return out;
}

/* ---------- жижиг дүрсүүд ---------- */
const I = {
  search: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  sliders: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>,
  chevron: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>,
  grid: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></svg>,
  map: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Z" /><path d="M9 4v13M15 6.5v13" /></svg>,
  pin: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>,
};

/** Зөвхөн эерэг бүхэл тоо авдаг талбар. Хасах тэмдэг, үсэг, хулганы дугуйгаар өөрчлөгдөхгүй.
 *  Мянгатыг зайгаар тусгаарлаж харуулна (320 000 000). */
function NumField({ name, initial, placeholder, unit, maxLen = 13, onValue }: {
  name: string; initial: string; placeholder: string; unit?: string; maxLen?: number; onValue: (k: string, v: string) => void;
}) {
  const [val, setVal] = useState(initial.replace(/\D/g, ''));
  const shown = val ? Number(val).toLocaleString('en-US').replace(/,/g, ' ') : '';
  return (
    <label className="num-field">
      <input
        type="text" inputMode="numeric" autoComplete="off" name={name} value={shown} placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, maxLen);
          setVal(raw); onValue(name, raw);
        }}
      />
      {unit && <span className="unit">{unit}</span>}
    </label>
  );
}

export default function SearchClient({ initialQuery }: { initialQuery: string }) {
  const [q, setQ] = useState(() => new URLSearchParams(initialQuery));
  const [result, setRes] = useState<SearchResult | null>(null);
  const res = result ?? { total: 0, page: 1, per: 24, items: [] };
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [pins, setPins] = useState<PinResult | null>(null); // газрын зургийн харагдацын бүх тэмдэг
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0); // "Дахин оролдох" дарахад дахин хайна
  const [advOpen, setAdvOpen] = useState(() => ADV_KEYS.some((k) => new URLSearchParams(initialQuery).get(k)));
  const [formKey, setFormKey] = useState(0); // "цэвэрлэх"-ийн дараа талбаруудыг шинээр зурна
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => { setView(store.get<'list' | 'map'>('view', 'list')); }, []);

  // Query эсвэл харагдац өөрчлөгдөх бүрт хайна.
  useEffect(() => {
    const apiQ = new URLSearchParams(q);
    window.history.replaceState(null, '', '/search' + (q.toString() ? '?' + q : ''));
    // Таб бүрийн тоог (бусад шүүлтүүр хэвээр) сервер нэг хүсэлтээр буцаана (facets=deal).
    apiQ.set('facets', 'deal');
    let stale = false;
    setFailed(false);
    const setTabCounts = (d?: { sale: number; rent: number }) => { if (d) setCounts({ '': d.sale + d.rent, sale: d.sale, rent: d.rent }); };
    // Газрын зураг: хуудаслалгүй, бүх тохирох зарын хөнгөн тэмдэг (GET /api/posts/pins, 1000 хүртэл)
    // Газрын зургийн харагдацад газрын зургийн доор зарын картуудыг мөн харуулна (хуудаслалттай).
    const list = searchListings(apiQ).then((r) => { if (!stale) { setRes(r); setTabCounts(r.dealCounts); } });
    const req = view === 'map'
      ? Promise.all([searchPins(apiQ).then((r) => { if (!stale) setPins(r); }), list])
      : list;
    req.catch(() => { if (!stale) setFailed(true); });
    return () => { stale = true; };
  }, [q, view, attempt]);

  // Хүлээгдэж буй (debounce) өөрчлөлтүүдийг алдахгүйн тулд нэг дор хуримтлуулна.
  const pending = useRef<((n: URLSearchParams) => void)[]>([]);
  const update = (mut: (n: URLSearchParams) => void, debounce = 0) => {
    clearTimeout(timer.current);
    pending.current.push(mut);
    const run = () => {
      const muts = pending.current; pending.current = [];
      setQ((prev) => { const n = new URLSearchParams(prev); muts.forEach((m) => m(n)); n.delete('page'); return n; });
    };
    if (debounce) timer.current = setTimeout(run, debounce); else run();
  };
  const setParam = (k: string, v: string, debounce = 0) => update((n) => { if (v) n.set(k, v); else n.delete(k); }, debounce);
  const setNum = (k: string, val: string) => setParam(k, val, 350);
  const onInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const t = e.target;
    if (t instanceof HTMLInputElement && t.type === 'checkbox') return setParam(t.name, t.checked ? '1' : '');
    setParam(t.name, t.value, t.type === 'search' ? 350 : 0);
  };

  const deal = q.get('deal') === 'rent' ? 'rent' : q.get('deal') === 'sale' ? 'sale' : '';
  const page = Number(q.get('page')) || 1;
  const pages = Math.ceil(res.total / res.per);
  const shownTotal = view === 'map' ? pins?.total : result?.total;
  const changeView = (v: 'list' | 'map') => { setView(v); store.set('view', v); };
  const goPage = (n: number) => { setQ((p) => { const x = new URLSearchParams(p); x.set('page', String(n)); return x; });
    // Газрын зургийн харагдацад жагсаалтын эхэнд, бусад үед хуудасны эхэнд гүйлгэнэ.
    const head = document.querySelector('.map-list-head');
    if (head) head.scrollIntoView({ behavior: 'smooth', block: 'start' }); else window.scrollTo(0, 0);
  };
  const v = (k: string) => q.get(k) || '';
  const advCount = useMemo(() => {
    const s = new Set(ADV_KEYS.filter((k) => q.get(k)).map((k) => k.replace(/(Min|Max)$/, '')));
    return s.size;
  }, [q]);
  const clearAll = () => { setQ(new URLSearchParams(deal ? { deal } : {})); setFormKey((k) => k + 1); };

  const pair = (lo: string, hi: string, unit?: string, maxLen?: number, ph: [string, string] = ['Доод', 'Дээд']) => (
    <div className="ff-pair">
      <NumField name={lo} initial={v(lo)} placeholder={ph[0]} unit={unit} maxLen={maxLen} onValue={setNum} />
      <NumField name={hi} initial={v(hi)} placeholder={ph[1]} unit={unit} maxLen={maxLen} onValue={setNum} />
    </div>
  );

  const listView = (
        <>
          <Grid items={res.items} empty="Тохирох зар олдсонгүй. " />
          {pages > 1 && (
            <nav className="pager" aria-label="Хуудас">
              <button className="btn btn-sm" disabled={page <= 1} onClick={() => goPage(page - 1)} aria-label="Өмнөх хуудас">‹</button>
              {pageList(page, pages).map((n, i) => n === '…'
                ? <span key={`gap${i}`} className="pager-gap" aria-hidden="true">…</span>
                : <button key={n} className={`btn btn-sm ${n === page ? 'btn-primary' : ''}`} aria-current={n === page ? 'page' : undefined}
                    onClick={() => goPage(n)}>{n}</button>)}
              <button className="btn btn-sm" disabled={page >= pages} onClick={() => goPage(page + 1)} aria-label="Дараагийн хуудас">›</button>
            </nav>
          )}
        </>
  );

  return (
    <div className="search-page">
      <form key={formKey} className="fbar" onSubmit={(e) => e.preventDefault()}>
        <div className="fbar-main">
          <label className="fsearch">
            {I.search}
            <input type="search" name="q" defaultValue={v('q')} onChange={onInput} placeholder="Байршил, түлхүүр үгээр хайх" aria-label="Түлхүүр үгээр хайх" />
          </label>
          <div className="fselect">
            <select name="cat" defaultValue={v('cat')} onChange={onInput} aria-label="Ангилал">
              <option value="">Бүх ангилал</option>{CAT_KEYS.map((k) => <option key={k} value={k}>{CATS[k].name}</option>)}
            </select>{I.chevron}
          </div>
          <div className="fselect has-ico">
            {I.pin}
            <select name="district" defaultValue={v('district')} onChange={onInput} aria-label="Дүүрэг">
              <option value="">Бүх дүүрэг</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}
            </select>{I.chevron}
          </div>
          <button type="button" className={`fbtn ${advOpen ? 'on' : ''}`} aria-expanded={advOpen} onClick={() => setAdvOpen((o) => !o)}>
            {I.sliders}<span>Нарийвчилсан</span>{advCount > 0 && <b className="fbadge">{advCount}</b>}
            <span className={`chev ${advOpen ? 'up' : ''}`}>{I.chevron}</span>
          </button>
          <div className="fview" role="group" aria-label="Харагдац">
            <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => changeView('list')}>{I.grid}<span>Жагсаалт</span></button>
            <button type="button" className={view === 'map' ? 'on' : ''} onClick={() => changeView('map')}>{I.map}<span>Газрын зураг</span></button>
          </div>
        </div>

        {advOpen && (
          <div className="fbar-adv">
            <div className="ff ff-wide"><span className="ff-label">Үнэ (₮)</span>{pair('priceMin', 'priceMax', '₮')}</div>
            <div className="ff">
              <span className="ff-label">Өрөө</span>
              <div className="fselect">
                <select name="roomsMin" defaultValue={v('roomsMin')} onChange={onInput} aria-label="Өрөөний тоо">
                  <option value="">Хамаагүй</option>{[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r}+ өрөө</option>)}
                </select>{I.chevron}
              </div>
            </div>
            <div className="ff">
              <span className="ff-label">Нийтэлсэн</span>
              <div className="fselect">
                <select name="posted" defaultValue={v('posted')} onChange={onInput} aria-label="Нийтэлсэн">
                  <option value="">Хамаагүй</option><option value="1">Өнөөдөр</option><option value="3">Сүүлийн 3 өдөр</option><option value="7">Сүүлийн 7 хоног</option>
                </select>{I.chevron}
              </div>
            </div>

            <div className="ff"><span className="ff-label">Талбай (м²)</span>{pair('areaMin', 'areaMax', 'м²', 6)}</div>
            <div className="ff">
              <span className="ff-label">Хэдэн давхарт</span>
              <div className="fselect">
                <select name="floor" defaultValue={v('floor')} onChange={onInput} aria-label="Хэдэн давхарт">
                  <option value="">Хамаагүй</option>
                  {FLOORS.map((f) => <option key={f} value={f}>{fmtFloor(f)} давхар</option>)}
                </select>{I.chevron}
              </div>
            </div>

            <div className="ff"><span className="ff-label">Ашиглалтад орсон он</span>{pair('yearMin', 'yearMax', undefined, 4, ['Оноос', 'Хүртэл'])}</div>
            <div className="ff ff-checks">
              <span className="ff-label">Нэмэлт</span>
              <div className="fchecks">
                {([['tour', '360° аялалтай'], ['leasing', 'Лизингтэй'], ['garage', 'Гаражтай'], ['notFirst', '1-р давхар биш'], ['notLast', 'Сүүлийн давхар биш']] as const).map(([k, label]) => (
                  <label key={k} className="fcheck"><input type="checkbox" name={k} defaultChecked={v(k) === '1'} onChange={onInput} /><span>{label}</span></label>
                ))}
              </div>
            </div>
            <div className="ff ff-end">
              <button type="button" className="flink" onClick={clearAll}>Шүүлтүүр цэвэрлэх</button>
            </div>
          </div>
        )}
      </form>

      <div className="ftabs-row">
        <div className="ftabs" role="tablist">
          {DEALS.map(({ key, label }) => (
            <button key={key || 'all'} type="button" role="tab" aria-selected={deal === key} className={`ftab ${deal === key ? 'on' : ''}`}
              onClick={() => setParam('deal', key)}>
              <span>{label}</span>
              <b className="fcount">{counts ? counts[key] ?? 0 : '·'}</b>
            </button>
          ))}
        </div>
        <div className="fselect fsort">
          <select value={q.get('sort') || 'new'} aria-label="Эрэмбэ" onChange={(e) => setParam('sort', e.target.value === 'new' ? '' : e.target.value)}>
            {SORTS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>{I.chevron}
        </div>
      </div>

      {!failed && <p className="fresult">{shownTotal != null ? <><b>{shownTotal}</b> зар олдлоо</> : 'Хайж байна…'}</p>}

      {failed ? <LoadError message="Зар хайж чадсангүй." onRetry={() => setAttempt((a) => a + 1)} />
      : view === 'map' ? (!pins ? <PageLoader /> : <>
        {pins.truncated && (
          <div className="map-note" role="status">
            <span>Газрын зураг дээр эхний <b>{pins.pins.length}</b> зарыг харуулж байна (нийт {pins.total}). Шүүлтүүрээр нарийсгана уу.</span>
            <button type="button" className="btn btn-sm" onClick={() => changeView('list')}>Жагсаалтаар бүгдийг үзэх</button>
          </div>
        )}
        {!pins.pins.length && <div className="empty">Тохирох зар олдсонгүй.</div>}
        <ResultsMap items={pins.pins} />
        {pins.pins.length > 0 && <>
          <h2 className="map-list-head">Газрын зураг дээрх зарууд</h2>
          {!result ? <PageLoader /> : listView}
        </>}
      </>)
      : !result ? <PageLoader /> : listView}
    </div>
  );
}
