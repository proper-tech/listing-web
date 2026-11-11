import Link from 'next/link';
import type { Listing } from '@/lib/types';
import { CATS, NOIMG, STATUS_MN } from '@/lib/constants';
import { fmtPrice, specLine } from '@/lib/format';
import FavButton from './FavButton';

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
      {l.hasTour && <span className="badge b360">360°</span>}
      {l.tour?.rooms.some((r) => r.source === 'ai') && <span className="badge ai">AI</span>}
      {l.status && l.status !== 'active' && <span className={`badge ${l.status}`}>{STATUS_MN[l.status]}</span>}
    </>
  );
}

export function coverImage(l: Pick<Listing, 'photos'> & Partial<Pick<Listing, 'tour'>>) {
  return l.photos[0]?.src || l.tour?.rooms.find((r) => r.panorama)?.panorama?.src || NOIMG;
}

export default function ListingCard({ l, preview = false }: { l: CardListing; preview?: boolean }) {
  const body = (
    <>
      <div className="card-img">
        <img loading="lazy" src={coverImage(l)} alt="" />
        <div className="badges"><Badges l={l} /></div>
      </div>
      <div className="card-body">
        <div className="card-top">
          <div className="price"><Price l={l} /></div>
          {!preview && <FavButton id={l.id} />}
        </div>
        <div className="title" title={l.title}>{l.title}</div>
        <div className="meta">{specLine(l) || CATS[l.category].name} · {l.location.district}</div>
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
