'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Listing } from '@/lib/types';
import { CATS } from '@/lib/constants';
import { fmtDate, fmtFloor, fmtFull, timeAgo } from '@/lib/format';
import { getListing, searchListings } from '@/lib/api/listings';
import { ApiError } from '@/lib/api/client';
import { Badges, Grid, Price } from './ListingCard';
import ListingMedia from './ListingMedia';
import { PhoneAndFav, ReportButton } from './ListingActions';
import InquiryForm from './InquiryForm';
import { MiniMap } from './Maps';
import { useAuth } from './Auth';
import PageLoader from '@/components/PageLoader';
import LoadError from '@/components/LoadError';
import Icon from './Icon';

export default function ListingView({ id, startWithTour }: { id: string; startWithTour: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const [l, setL] = useState<Listing | null | 'missing' | 'error'>(null);
  const [similar, setSimilar] = useState<Listing[] | null | 'failed'>(null);
  const [attempt, setAttempt] = useState(0); // listing or similar failed → "Дахин оролдох"
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
      setSimilar(null);
      try {
        const sim = await searchListings({ deal: x.dealType, cat: x.category, per: '9' });
        if (stale) return;
        setSimilar(sim.items.filter((s) => s.id !== x.id)
          .sort((a, b) => Number(b.location.district === x.location.district) - Number(a.location.district === x.location.district) || Math.abs(a.price - x.price) - Math.abs(b.price - x.price))
          .slice(0, 4));
      } catch { if (!stale) setSimilar('failed'); }
    }).catch((e) => {
      if (stale) return;
      // 404 = the ad is gone; anything else (network, server) can be retried
      setL(e instanceof ApiError && e.status !== 404 && e.status !== 403 ? 'error' : 'missing');
    });
    return () => { stale = true; };
  }, [id, authLoading, user?.id, attempt]);

  useEffect(() => { if (l && l !== 'missing' && l !== 'error') document.title = `${l.title} — ProperTech`; }, [l]);

  if (!l) return <PageLoader />;
  if (l === 'error') return <LoadError message="Зарыг ачаалж чадсангүй." onRetry={() => { setL(null); setAttempt((a) => a + 1); }} />;
  if (l === 'missing') return <div className="empty">Зар олдсонгүй. <Link href="/">Нүүр хуудас</Link></div>;

  const specs: [string, string | number | undefined | null | false][] = [
    ['Ангилал', CATS[l.category].name], ['Төрөл', l.dealType === 'rent' ? 'Түрээслүүлнэ' : 'Зарна'],
    ['Өрөө', l.rooms], ['Талбай', l.area && `${l.area} м²`], ['м² үнэ', l.pricePerM2 && fmtFull(l.pricePerM2)],
    ['Хэдэн давхарт', l.floor != null ? fmtFloor(l.floor) : undefined], ['Барилгын давхар', l.buildingFloors], ['Ашиглалтад орсон он', l.yearInUse],
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
            <div className="badges badges-inline"><Badges l={l} /></div>
            <ListingMedia photos={l.photos} tour={l.tour} startWithTour={startWithTour} />
          </div>
          <div className="panel mt-4">
            <h2 className="mt-0">Дэлгэрэнгүй</h2>
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
            <div className="seller my-4">
              <div className="avatar">{l.sellerAvatar ? <img src={l.sellerAvatar} alt="" /> : l.sellerName.slice(0, 1)}</div>
              <div><b>{l.sellerName}</b><div className="muted small">{l.sellerType === 'owner' ? 'Эзэмшигч' : 'Агент'}</div></div>
            </div>
            {l.status === 'active' ? <PhoneAndFav id={l.id} title={l.title} image={l.photos[0]?.src} />
              : l.status === 'unpaid' ? <>
                  <div className="muted small mb-3">Төлбөр төлөгдөөгүй тул зар нийтлэгдээгүй байна.</div>
                  <Link className="btn btn-primary btn-block" href={`/pay/${l.id}`}>Төлбөр төлөх</Link>
                </>
              : <div className="muted small">Зар нийтлэгдээгүй байна — утас харагдахгүй.</div>}
          </div>
          {l.status === 'active' && <InquiryForm id={l.id} title={l.title} />}
          <div className="panel">
            <div className="kv"><span>Зарын дугаар</span><b>{l.id}</b></div>
            <div className="kv"><span>Нийтэлсэн</span><span>{fmtDate(l.createdAt)} ({timeAgo(l.createdAt)})</span></div>
            <div className="kv"><span>Үзсэн</span><span>{l.views}</span></div>
            {user?.role === 'admin' && <Link className="btn btn-sm btn-block admin-edit-btn" href={`/admin/edit/${l.id}`}><Icon name="edit" /> Зар засах (админ)</Link>}
            <ReportButton id={l.id} />
          </div>
        </aside>
      </div>
      <h2>Төстэй зар</h2>
      {similar === 'failed' ? <LoadError compact message="Төстэй зар ачаалж чадсангүй." onRetry={() => setAttempt((a) => a + 1)} />
        : similar ? <Grid items={similar} empty="Төстэй зар алга" />
        : <div className="grid" aria-busy="true" aria-label="Ачаалж байна">{[0, 1, 2, 3].map((i) => <div key={i} className="card card-skeleton" />)}</div>}
    </>
  );
}
