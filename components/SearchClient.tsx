'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SearchResult } from '@/lib/types';
import { CATS, CAT_KEYS, DISTRICTS } from '@/lib/constants';
import { api } from '@/lib/api';
import { store } from '@/lib/store';
import { Grid } from './ListingCard';
import { ResultsMap } from './Maps';

const RANGES: [string, string, string][] = [
  ['Үнэ (₮)', 'priceMin', 'priceMax'], ['м² үнэ (₮)', 'ppmMin', 'ppmMax'], ['Талбай (м²)', 'areaMin', 'areaMax'],
  ['Хэдэн давхарт', 'floorMin', 'floorMax'], ['Барилгын давхар', 'bfMin', 'bfMax'], ['Ашиглалтанд орсон он', 'yearMin', 'yearMax'],
];
const SORTS: [string, string][] = [['new', 'Шинэ эхэндээ'], ['cheap', 'Хямд эхэндээ'], ['expensive', 'Үнэтэй эхэндээ'], ['ppm2', 'м² үнэ (бага)'], ['area', 'Талбай (их)']];

export default function SearchClient({ initialQuery, initial }: { initialQuery: string; initial: SearchResult }) {
  const [q, setQ] = useState(() => new URLSearchParams(initialQuery));
  const [res, setRes] = useState(initial);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [formKey, setFormKey] = useState(0); // remounts the form after "reset"
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => { setView(store.get<'list' | 'map'>('view', 'list')); }, []);

  // Fetch whenever the query or view changes (the first render uses server data).
  useEffect(() => {
    const apiQ = new URLSearchParams(q);
    if (view === 'map') { apiQ.set('per', '60'); apiQ.delete('page'); }
    window.history.replaceState(null, '', '/search' + (q.toString() ? '?' + q : ''));
    if (first.current && view === 'list') { first.current = false; return; }
    first.current = false;
    let stale = false;
    api<SearchResult>('/api/listings?' + apiQ).then((r) => { if (!stale) setRes(r); }).catch(() => {});
    return () => { stale = true; };
  }, [q, view]);

  const update = (mut: (n: URLSearchParams) => void, debounce = 0) => {
    clearTimeout(timer.current);
    const run = () => setQ((prev) => { const n = new URLSearchParams(prev); mut(n); n.delete('page'); return n; });
    if (debounce) timer.current = setTimeout(run, debounce); else run();
  };
  const setParam = (k: string, v: string, debounce = 0) => update((n) => { if (v) n.set(k, v); else n.delete(k); }, debounce);
  const onInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const t = e.target;
    if (t instanceof HTMLInputElement && t.type === 'checkbox') return setParam(t.name, t.checked ? '1' : '');
    setParam(t.name, t.value, t.type === 'number' || t.type === 'search' ? 350 : 0);
  };
  const rooms = useMemo(() => (q.get('rooms') || '').split(',').filter(Boolean), [q]);
  const toggleRoom = (r: string) => {
    const next = rooms.includes(r) ? rooms.filter((x) => x !== r) : [...rooms, r];
    setParam('rooms', next.sort().join(','));
  };
  const deal = q.get('deal') === 'rent' ? 'rent' : 'sale';
  const page = Number(q.get('page')) || 1;
  const pages = Math.ceil(res.total / res.per);
  const changeView = (v: 'list' | 'map') => { setView(v); store.set('view', v); };
  const v = (k: string) => q.get(k) || '';

  return (
    <div className="search-layout">
      <aside className={`filters ${filtersOpen ? 'open' : ''}`}>
        <form key={formKey} onSubmit={(e) => e.preventDefault()}>
          <h3>Төрөл</h3>
          <div className="seg" style={{ marginBottom: 8 }}>
            {(['sale', 'rent'] as const).map((d) => (
              <button type="button" key={d} className={deal === d ? 'on' : ''} onClick={() => setParam('deal', d)}>{d === 'sale' ? 'Зарна' : 'Түрээс'}</button>
            ))}
          </div>
          <select name="cat" defaultValue={v('cat')} onChange={onInput} aria-label="Ангилал">
            <option value="">Бүх ангилал</option>{CAT_KEYS.map((k) => <option key={k} value={k}>{CATS[k].name}</option>)}
          </select>
          <h3>Түлхүүр үг</h3>
          <input type="search" name="q" defaultValue={v('q')} onChange={onInput} placeholder="Жишээ нь: Зайсан, хотхон" />
          <h3>Байршил</h3>
          <select name="district" defaultValue={v('district')} onChange={onInput} aria-label="Дүүрэг">
            <option value="">Бүх дүүрэг</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}
          </select>
          {RANGES.slice(0, 2).map(([label, lo, hi]) => (
            <div key={lo}><h3>{label}</h3><div className="row2">
              <input type="number" name={lo} defaultValue={v(lo)} onChange={onInput} placeholder="Доод" />
              <input type="number" name={hi} defaultValue={v(hi)} onChange={onInput} placeholder="Дээд" /></div></div>
          ))}
          <h3>Өрөө</h3>
          <div className="chips">
            {['1', '2', '3', '4', '5'].map((r) => (
              <button type="button" key={r} className={`chip ${rooms.includes(r) ? 'on' : ''}`} onClick={() => toggleRoom(r)}>{r === '5' ? '5+' : r}</button>
            ))}
          </div>
          {RANGES.slice(2).map(([label, lo, hi]) => (
            <div key={lo}><h3>{label}</h3><div className="row2">
              <input type="number" name={lo} defaultValue={v(lo)} onChange={onInput} placeholder="Доод" />
              <input type="number" name={hi} defaultValue={v(hi)} onChange={onInput} placeholder="Дээд" /></div>
              {lo === 'floorMin' && <>
                <label className="check"><input type="checkbox" name="notFirst" defaultChecked={v('notFirst') === '1'} onChange={onInput} /> 1-р давхар биш</label>
                <label className="check"><input type="checkbox" name="notLast" defaultChecked={v('notLast') === '1'} onChange={onInput} /> Сүүлийн давхар биш</label>
              </>}
            </div>
          ))}
          <h3>Нэмэлт</h3>
          <label className="check"><input type="checkbox" name="tour" defaultChecked={v('tour') === '1'} onChange={onInput} /> 360° аялалтай</label>
          <label className="check"><input type="checkbox" name="leasing" defaultChecked={v('leasing') === '1'} onChange={onInput} /> Лизингээр авах боломжтой</label>
          <label className="check"><input type="checkbox" name="garage" defaultChecked={v('garage') === '1'} onChange={onInput} /> Гаражтай</label>
          <h3>Нийтэлсэн</h3>
          <select name="posted" defaultValue={v('posted')} onChange={onInput} aria-label="Нийтэлсэн">
            <option value="">Хамаагүй</option><option value="1">Өнөөдөр</option><option value="3">Сүүлийн 3 өдөр</option><option value="7">Сүүлийн 7 хоног</option>
          </select>
          <h3>Зар оруулагч</h3>
          <select name="seller" defaultValue={v('seller')} onChange={onInput} aria-label="Зар оруулагч">
            <option value="">Бүгд</option><option value="owner">Эзэмшигч</option><option value="agent">Агент</option>
          </select>
          <button type="button" className="btn btn-block" style={{ marginTop: 14 }}
            onClick={() => { setQ(new URLSearchParams({ deal })); setFormKey((k) => k + 1); }}>Шүүлтүүр цэвэрлэх</button>
        </form>
      </aside>
      <section>
        <div className="results-bar">
          <button className="btn filters-toggle" onClick={() => setFiltersOpen((o) => !o)}>☰ Шүүлтүүр</button>
          <b className="grow">{res.total} зар</b>
          <select value={q.get('sort') || 'new'} aria-label="Эрэмбэ" onChange={(e) => setParam('sort', e.target.value === 'new' ? '' : e.target.value)}>
            {SORTS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>
          <div className="seg">
            <button className={view === 'list' ? 'on' : ''} onClick={() => changeView('list')}>Жагсаалт</button>
            <button className={view === 'map' ? 'on' : ''} onClick={() => changeView('map')}>Газрын зураг</button>
          </div>
        </div>
        {view === 'list' ? (
          <>
            <Grid items={res.items} empty="Таны шүүлтүүрт тохирох зар олдсонгүй. Шүүлтүүрээ багасгаад үзээрэй." />
            {pages > 1 && (
              <div className="pager">
                {Array.from({ length: pages }, (_, i) => (
                  <button key={i} className={`btn btn-sm ${i + 1 === page ? 'btn-primary' : ''}`}
                    onClick={() => { setQ((p) => { const n = new URLSearchParams(p); n.set('page', String(i + 1)); return n; }); window.scrollTo(0, 0); }}>{i + 1}</button>
                ))}
              </div>
            )}
          </>
        ) : <ResultsMap items={res.items} />}
      </section>
    </div>
  );
}
