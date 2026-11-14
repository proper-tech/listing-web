import Link from 'next/link';
import type { Listing } from '@/lib/types';
import { CATS, NOIMG, STATUS_MN } from '@/lib/constants';
import { fmtFloor, fmtPrice } from '@/lib/format';
import FavButton from './FavButton';
import Icon from './Icon';

type CardListing = Pick<Listing, 'id' | 'title' | 'price' | 'dealType' | 'category' | 'rooms' | 'area' | 'floor' | 'buildingFloors' | 'photos' | 'location' | 'createdAt' | 'hasTour' | 'promo'>
  & Partial<Pick<Listing, 'tour' | 'status'>>;

export function Price({ l }: { l: Pick<Listing, 'price' | 'dealType'> }) {
  return <>{fmtPrice(l.price)}{l.dealType === 'rent' && <small> /сар</small>}</>;
}

export function Badges({ l }: { l: CardListing }) {
  return (
    <>
      {l.promo === 2 && <span className="badge top">Онцгой</span>}
      {l.promo === 1 && <span className="badge vip">VIP</span>}
      {l.hasTour && <span className="badge b360"><Icon name="tour" size={13} />360°</span>}
      {l.tour?.rooms.some((r) => r.source === 'ai') && <span className="badge ai">AI</span>}
      {l.status && l.status !== 'active' && <span className={`badge ${l.status}`}>{STATUS_MN[l.status]}</span>}
    </>
  );
}

export function coverImage(l: Pick<Listing, 'photos'> & Partial<Pick<Listing, 'tour'>>) {
  return l.photos[0]?.src || l.tour?.rooms.find((r) => r.panorama)?.panorama?.src || NOIMG;
}

/** Картын доорх үзүүлэлтүүд: "2 ӨРӨӨ | 73 М² | 5/12 ДАВХАР". */
function specParts(l: CardListing): string[] {
  const p: string[] = [];
  if (l.rooms) p.push(`${l.rooms} өрөө`);
  if (l.area) p.push(`${l.area} м²`);
  if (l.floor && l.buildingFloors) p.push(`${fmtFloor(l.floor)}/${l.buildingFloors} давхар`);
  else if (l.floor) p.push(`${fmtFloor(l.floor)} давхар`);
  return p;
}

export default function ListingCard({ l, preview = false }: { l: CardListing; preview?: boolean }) {
  const specs = specParts(l);
  const cover = coverImage(l);
  const body = (
    <>
      <div className={`card-img${cover === NOIMG ? ' no-photo' : ''}`}>
        <img loading="lazy" src={cover} alt="" />
        <div className="badges"><Badges l={l} /></div>
        {!preview && <div className="card-fav"><FavButton id={l.id} /></div>}
        <span className={`card-tag ${l.dealType}`}>{l.dealType === 'rent' ? 'Түрээс' : 'Зарна'} · {CATS[l.category].name}</span>
      </div>
      <div className="card-body">
        <div className="card-loc">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
          <span>{[l.location.district, l.location.city || 'Улаанбаатар'].filter(Boolean).join(', ')}</span>
        </div>
        <div className="title" title={l.title}>{l.title}</div>
        <div className="card-specs">
          {specs.length ? specs.map((s) => <span key={s}>{s}</span>) : <span>{CATS[l.category].name}</span>}
        </div>
        <div className="card-foot">
          <div className="price"><Price l={l} /></div>
        </div>
      </div>
    </>
  );
  const cls = `card ${l.promo === 2 ? 'promo-top' : l.promo === 1 ? 'promo-vip' : ''}`;
  return preview ? <div className={cls}>{body}</div> : <Link className={cls} href={`/listing/${l.id}`}>{body}</Link>;
}

export function Grid({ items, empty = 'Зар олдсонгүй', className = '' }: { items: CardListing[]; empty?: string; className?: string }) {
  if (!items.length) return <div className="empty">{empty}</div>;
  return <div className={`grid ${className}`.trim()}>{items.map((l) => <ListingCard key={l.id} l={l} />)}</div>;
}
