'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Listing } from '@/lib/types';
import { CATS } from '@/lib/constants';
import { fmtDate, fmtFull, timeAgo } from '@/lib/format';
import { getListing, searchListings } from '@/lib/mock/api';
import { Badges, Grid, Price } from './ListingCard';
import ListingMedia from './ListingMedia';
import { PhoneAndFav, ReportButton } from './ListingActions';
import { MiniMap } from './Maps';
import { useAuth } from './Auth';

export default function ListingView({ id, startWithTour }: { id: string; startWithTour: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const [l, setL] = useState<Listing | null | 'missing'>(null);
  const [similar, setSimilar] = useState<Listing[] | null>(null);
  const counted = useRef(false);

  // wait for the login check: unpublished ads are visible to their owner and admins
  useEffect(() => {
    if (authLoading) return;
    let stale = false;
    const countView = !counted.current;
    counted.current = true;
    getListing(id, { countView }).then(async (x) => {
      if (stale) return;
      setL(x);
      const sim = await searchListings({ deal: x.dealType, cat: x.category, per: '9' });
      if (stale) return;
      setSimilar(sim.items.filter((s) => s.id !== x.id)
        .sort((a, b) => Number(b.location.district === x.location.district) - Number(a.location.district === x.location.district) || Math.abs(a.price - x.price) - Math.abs(b.price - x.price))
        .slice(0, 4));
    }).catch(() => { if (!stale) setL('missing'); });
    return () => { stale = true; };
  }, [id, authLoading, user?.id]);

  useEffect(() => { if (l && l !== 'missing') document.title = `${l.title} — ProperTech`; }, [l]);

  if (!l) return <div className="loading">Ачаалж байна…</div>;
  if (l === 'missing') return <div className="empty">Зар олдсонгүй. <Link href="/">Нүүр хуудас</Link></div>;

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
            <ListingMedia photos={l.photos} tour={l.tour} startWithTour={startWithTour} />
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
            {l.status === 'active' ? <PhoneAndFav id={l.id} title={l.title} /> : <div className="muted small">Зар нийтлэгдээгүй байна — утас харагдахгүй.</div>}
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
      {similar ? <Grid items={similar} empty="Төстэй зар алга" /> : <div className="loading">Ачаалж байна…</div>}
    </>
  );
}
