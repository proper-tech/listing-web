import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { NotFoundError, serverApi } from '@/lib/api';
import type { Listing, SearchResult } from '@/lib/types';
import { CATS } from '@/lib/constants';
import { fmtDate, fmtFull, fmtPrice, timeAgo } from '@/lib/format';
import { Badges, Grid, Price, coverImage } from '@/components/ListingCard';
import ListingMedia from '@/components/ListingMedia';
import { PhoneAndFav, ReportButton } from '@/components/ListingActions';
import { MiniMap } from '@/components/Maps';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tour?: string }> };

// One request per page render (shared by generateMetadata and the page). noview=1 for metadata only.
const getListing = cache(async (id: string, countView: boolean) => {
  try { return await serverApi<Listing>(`/api/listings/${encodeURIComponent(id)}${countView ? '' : '?noview=1'}`); }
  catch (e) { if (e instanceof NotFoundError) notFound(); throw e; }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await getListing((await params).id, false);
  const desc = `${fmtPrice(l.price)} · ${CATS[l.category].name} · ${l.location.district}. ${(l.description || '').slice(0, 140)}`;
  return { title: l.title, description: desc, openGraph: { title: l.title, description: desc, images: [coverImage(l)] } };
}

export default async function ListingPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tour } = await searchParams;
  const l = await getListing(id, true);
  const specs: [string, string | number | undefined | null | false][] = [
    ['Ангилал', CATS[l.category].name], ['Төрөл', l.dealType === 'rent' ? 'Түрээслүүлнэ' : 'Зарна'],
    ['Өрөө', l.rooms], ['Талбай', l.area && `${l.area} м²`], ['м² үнэ', l.pricePerM2 && fmtFull(l.pricePerM2)],
    ['Хэдэн давхарт', l.floor], ['Барилгын давхар', l.buildingFloors], ['Ашиглалтанд орсон он', l.yearInUse],
    ['Шал', l.floorMaterial], ['Тагт', l.balconies], ['Цонх', l.windowType], ['Цонхны тоо', l.windowCount],
    ['Хаалга', l.doorType], ['Гараж', l.garage ? 'Байгаа' : null], ['Лизинг', l.leasing ? 'Боломжтой' : 'Боломжгүй'],
    ['Төлбөрийн нөхцөл', (l.paymentTerms || []).join(', ')],
    ['Байршил', [l.location.district, l.location.khoroo, l.location.address].filter(Boolean).join(', ')],
  ];
  const shown = specs.filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false);

  const sim = await serverApi<SearchResult>(`/api/listings?deal=${l.dealType}&cat=${l.category}&per=9`);
  const similar = sim.items.filter((x) => x.id !== l.id)
    .sort((a, b) => Number(b.location.district === l.location.district) - Number(a.location.district === l.location.district) || Math.abs(a.price - l.price) - Math.abs(b.price - l.price))
    .slice(0, 4);

  return (
    <>
      <div className="crumbs">
        <Link href="/">Нүүр</Link> › <Link href={`/search?deal=${l.dealType}`}>{l.dealType === 'rent' ? 'Түрээс' : 'Зарна'}</Link> ›{' '}
        <Link href={`/search?deal=${l.dealType}&cat=${l.category}`}>{CATS[l.category].name}</Link> › {l.location.district}
      </div>
      <div className="listing">
        <div>
          <div className="panel">
            <h1>{l.title}</h1>
            <div className="badges" style={{ position: 'static', marginBottom: 10 }}><Badges l={l} /></div>
            <ListingMedia photos={l.photos} tour={l.tour} startWithTour={tour === '1'} />
          </div>
          <div className="panel" style={{ marginTop: 16 }}>
            <h2 style={{ marginTop: 0 }}>Дэлгэрэнгүй</h2>
            <dl className="specs">{shown.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            {l.description && <><h3>Тайлбар</h3><p className="desc">{l.description}</p></>}
            <h3>Байршил</h3>
            <MiniMap lat={l.location.lat} lng={l.location.lng} />
          </div>
        </div>
        <aside className="side">
          <div className="panel">
            <div className="price"><Price l={l} /></div>
            {l.pricePerM2 && <div className="muted small">м² — {fmtFull(l.pricePerM2)}</div>}
            <div className="seller" style={{ margin: '16px 0' }}>
              <div className="avatar">{l.sellerName.slice(0, 1)}</div>
              <div><b>{l.sellerName}</b><div className="muted small">{l.sellerType === 'owner' ? 'Эзэмшигч' : 'Агент'}</div></div>
            </div>
            <PhoneAndFav id={l.id} title={l.title} />
          </div>
          <div className="panel">
            <div className="kv"><span>Зарын дугаар</span><b>{l.id}</b></div>
            <div className="kv"><span>Нийтэлсэн</span><span>{fmtDate(l.createdAt)} ({timeAgo(l.createdAt)})</span></div>
            <div className="kv"><span>Үзсэн</span><span>{l.views}</span></div>
            <ReportButton id={l.id} />
          </div>
        </aside>
      </div>
      <h2>Төстэй зар</h2>
      <Grid items={similar} empty="Төстэй зар алга" />
    </>
  );
}
