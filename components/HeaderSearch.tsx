'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CATS, CAT_KEYS, DISTRICTS } from '@/lib/constants';
import { fmtFloor } from '@/lib/format';

// Header-ийн "Хайх" товч: дарахад шүүлтүүрүүд dropdown болж гарч ирнэ.
// "Хайх" дарахад /search хуудас руу сонгосон шүүлтүүртэйгээр шилжинэ.

const FLOORS = [-3, -2, -1, ...Array.from({ length: 40 }, (_, i) => i + 1)];

/** Зөвхөн эерэг бүхэл тоо (хасах, үсэг, хулганы дугуйгаар өөрчлөгдөхгүй), мянгатыг зайгаар. */
function NumField({ name, initial, placeholder, unit, maxLen = 13 }: { name: string; initial: string; placeholder: string; unit?: string; maxLen?: number }) {
  const [val, setVal] = useState(initial.replace(/\D/g, ''));
  return (
    <label className="num-field">
      <input type="text" inputMode="numeric" autoComplete="off" placeholder={placeholder} aria-label={placeholder}
        value={val ? Number(val).toLocaleString('en-US').replace(/,/g, ' ') : ''}
        onChange={(e) => setVal(e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, maxLen))} />
      <input type="hidden" name={name} value={val} />
      {unit && <span className="unit">{unit}</span>}
    </label>
  );
}

export default function HeaderSearch() {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [openNo, setOpenNo] = useState(0); // нээх бүрт формыг URL-ээс шинээр уншина
  const box = useRef<HTMLDivElement>(null);

  const init = path === '/search' ? sp : new URLSearchParams();
  const v = (k: string) => init.get(k) || '';
  const [deal, setDeal] = useState<'sale' | 'rent'>('sale');
  const [rooms, setRooms] = useState<string[]>([]);

  const toggle = () => {
    if (!open) {
      setDeal(v('deal') === 'rent' ? 'rent' : 'sale');
      setRooms(v('rooms').split(',').filter(Boolean));
      setOpenNo((n) => n + 1);
    }
    setOpen((o) => !o);
  };

  // Гадна дарах, Esc, хуудас солигдоход хаана.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  useEffect(() => { setOpen(false); }, [path, sp]);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = new URLSearchParams({ deal });
    for (const [k, val] of new FormData(e.currentTarget)) if (typeof val === 'string' && val.trim()) q.set(k, val.trim());
    if (rooms.length) q.set('rooms', [...rooms].sort().join(','));
    setOpen(false);
    router.push('/search?' + q.toString());
  };
  const reset = () => { setDeal('sale'); setRooms([]); setOpenNo((n) => n + 1); };

  const pair = (lo: string, hi: string, unit?: string, maxLen?: number, ph: [string, string] = ['Доод', 'Дээд']) => (
    <div className="row2">
      <NumField name={lo} initial={v(lo)} placeholder={ph[0]} unit={unit} maxLen={maxLen} />
      <NumField name={hi} initial={v(hi)} placeholder={ph[1]} unit={unit} maxLen={maxLen} />
    </div>
  );
  const check = (k: string, label: string) => (
    <label className="check"><input type="checkbox" name={k} value="1" defaultChecked={v(k) === '1'} /> {label}</label>
  );

  return (
    <div className="hs" ref={box}>
      <button type="button" className={`hs-btn ${open ? 'on' : ''}`} aria-expanded={open} aria-haspopup="dialog" onClick={toggle}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span>Хайх</span>
      </button>

      {open && (
        <div className="hs-panel" role="dialog" aria-label="Зар хайх">
          <form key={openNo} onSubmit={submit}>
            <div className="hs-top">
              <div className="seg">
                {(['sale', 'rent'] as const).map((d) => (
                  <button type="button" key={d} className={deal === d ? 'on' : ''} onClick={() => setDeal(d)}>{d === 'sale' ? 'Зарна' : 'Түрээс'}</button>
                ))}
              </div>
              <label className="hs-q">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input type="search" name="q" defaultValue={v('q')} placeholder="Түлхүүр үг: Зайсан, хотхон…" autoFocus />
              </label>
              <select name="cat" defaultValue={v('cat')} aria-label="Ангилал">
                <option value="">Бүх ангилал</option>{CAT_KEYS.map((k) => <option key={k} value={k}>{CATS[k].name}</option>)}
              </select>
              <select name="district" defaultValue={v('district')} aria-label="Дүүрэг">
                <option value="">Бүх дүүрэг</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div className="hs-grid">
              <div><h3>Үнэ (₮)</h3>{pair('priceMin', 'priceMax', '₮')}</div>
              <div><h3>м² үнэ (₮)</h3>{pair('ppmMin', 'ppmMax', '₮')}</div>
              <div><h3>Талбай (м²)</h3>{pair('areaMin', 'areaMax', 'м²', 6)}</div>
              <div>
                <h3>Өрөө</h3>
                <div className="chips chips-rooms">
                  {['1', '2', '3', '4', '5'].map((r) => (
                    <button type="button" key={r} aria-pressed={rooms.includes(r)} className={`chip ${rooms.includes(r) ? 'on' : ''}`}
                      onClick={() => setRooms((x) => (x.includes(r) ? x.filter((y) => y !== r) : [...x, r]))}>{r === '5' ? '5+' : r}</button>
                  ))}
                </div>
              </div>
              <div>
                <h3>Хэдэн давхарт</h3>
                <div className="row2">
                  {(['floorMin', 'floorMax'] as const).map((k, i) => (
                    <select key={k} name={k} defaultValue={v(k)} aria-label={i ? 'Дээд давхар' : 'Доод давхар'}>
                      <option value="">{i ? 'Дээд' : 'Доод'}</option>{FLOORS.map((f) => <option key={f} value={f}>{fmtFloor(f)}</option>)}
                    </select>
                  ))}
                </div>
                {check('notFirst', '1-р давхар биш')}
                {check('notLast', 'Сүүлийн давхар биш')}
              </div>
              <div><h3>Барилгын давхар</h3>{pair('bfMin', 'bfMax', undefined, 3)}</div>
              <div><h3>Ашиглалтанд орсон он</h3>{pair('yearMin', 'yearMax', undefined, 4, ['Оноос', 'Хүртэл'])}</div>
              <div>
                <h3>Нэмэлт</h3>
                {check('tour', '360° аялалтай')}
                {check('leasing', 'Лизингээр авах боломжтой')}
                {check('garage', 'Гаражтай')}
              </div>
              <div>
                <h3>Нийтэлсэн</h3>
                <select name="posted" defaultValue={v('posted')} aria-label="Нийтэлсэн">
                  <option value="">Хамаагүй</option><option value="1">Өнөөдөр</option><option value="3">Сүүлийн 3 өдөр</option><option value="7">Сүүлийн 7 хоног</option>
                </select>
              </div>
              <div>
                <h3>Зар оруулагч</h3>
                <select name="seller" defaultValue={v('seller')} aria-label="Зар оруулагч">
                  <option value="">Бүгд</option><option value="owner">Эзэмшигч</option><option value="agent">Агент</option>
                </select>
              </div>
            </div>

            <div className="hs-foot">
              <button type="button" className="hs-reset" onClick={reset}>Цэвэрлэх</button>
              <div className="hs-actions">
                <button type="button" className="btn" onClick={() => setOpen(false)}>Болих</button>
                <button type="submit" className="btn btn-primary">Хайх</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
