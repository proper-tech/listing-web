'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getListing } from '@/lib/api/listings';
import { useFavs } from '@/lib/store';
import type { Listing } from '@/lib/types';
import { CATS } from '@/lib/constants';
import { fmtFull } from '@/lib/format';
import { Grid, Price } from '@/components/ListingCard';
import PageLoader from '@/components/PageLoader';

const ROWS: [string, (l: Listing) => React.ReactNode][] = [
  ['Үнэ', (l) => <Price l={l} />], ['м² үнэ', (l) => (l.pricePerM2 ? fmtFull(l.pricePerM2) : '—')], ['Ангилал', (l) => CATS[l.category].name],
  ['Өрөө', (l) => l.rooms ?? '—'], ['Талбай', (l) => (l.area ? `${l.area} м²` : '—')], ['Давхар', (l) => (l.floor ? `${l.floor}/${l.buildingFloors || '?'}` : '—')],
  ['Он', (l) => l.yearInUse ?? '—'], ['Дүүрэг', (l) => l.location.district], ['Лизинг', (l) => (l.leasing ? 'Тийм' : 'Үгүй')],
  ['360° аялал', (l) => (l.hasTour ? <Link href={`/listing/${l.id}?tour=1`}>Үзэх</Link> : '—')],
];

export default function SavedPage() {
  const ids = useFavs();
  const [items, setItems] = useState<Listing[] | null>(null);
  const key = ids.join(',');
  useEffect(() => {
    let stale = false;
    Promise.all(ids.map((id) => getListing(id).catch(() => null)))
      .then((r) => { if (!stale) setItems(r.filter((x): x is Listing => !!x)); });
    return () => { stale = true; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!items) return <PageLoader />;
  if (!items.length) return <><h1 className="mt-5">Хадгалсан зар</h1><div className="empty">Хадгалсан зар алга.</div></>;
  const cmp = items.slice(0, 4);
  return (
    <>
      <h1 className="mt-5">Хадгалсан зар ({items.length})</h1>
      <Grid items={items} />
      {items.length > 1 && <>
        <h2>Харьцуулах</h2>
        <div className="compare"><table><tbody>
          <tr><th />{cmp.map((l) => <td key={l.id}><Link href={`/listing/${l.id}`}><b>{l.title}</b></Link></td>)}</tr>
          {ROWS.map(([k, f]) => <tr key={k}><th>{k}</th>{cmp.map((l) => <td key={l.id}>{f(l)}</td>)}</tr>)}
        </tbody></table></div>
        {items.length > 4 && <p className="muted small">Эхний 4 зарыг харьцуулж байна.</p>}
      </>}
    </>
  );
}
