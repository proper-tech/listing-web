'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Category, SearchResult, Stats } from '@/lib/types';
import { CATS, CAT_KEYS, DISTRICTS } from '@/lib/constants';
import { getStats, searchListings } from '@/lib/mock/api';
import { Grid } from './ListingCard';
import HeroSearch from './HeroSearch';
import CatIcon from './CatIcon';
import HeroVideo from './HeroVideo';

type Data = { stats: Stats; top: SearchResult; fresh: SearchResult; tours: SearchResult };
type Deal = 'sale' | 'rent';

/* Category tile illustrations: clay-style 3D, transparent PNG, 288px square, in public/cats/ (generated with Higgsfield GPT Image 2.6).
   A category without one falls back to its line icon. Add the path here when the image is in public/cats/. */
const CAT_ART: Partial<Record<Category, string>> = Object.fromEntries(
  (['apartment', 'house', 'land', 'office', 'shop', 'warehouse', 'garage', 'summer_house'] as const).map((k) => [k, `/cats/${k}.png`]),
);

/* "How it works" strip: three steps from search to call. Icons are 24px line drawings like CatIcon. */
const STEPS: { title: string; text: string; icon: React.ReactNode }[] = [
  { title: 'Хайх', text: 'Дүүрэг, төрөл, үнээр шүүж өөрт тохирох зараа хурдан олоорой.',
    icon: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.4-4.4" /></> },
  { title: '360°-аар үзэх', text: 'Өрөө бүрээр онлайнаар алхаж, байраа очиж үзэхээсээ өмнө бүрэн танилцаарай.',
    icon: <><path d="M20.5 12a8.5 8.5 0 1 1-2.5-6M20.5 3.5V7H17" /><path d="M12 8.5l3 1.7v3.6L12 15.5l-3-1.7v-3.6zM12 12l3-1.8M12 12l-3-1.8M12 12v3.5" /></> },
  { title: 'Шууд холбогдох', text: 'Зар оруулагчийн утасны дугаар шууд харагдана — нэг товшилтоор залгаарай.',
    icon: <path d="M5 4h3.5l1.5 4-2 1.3a10 10 0 0 0 6.7 6.7L16 14l4 1.5V19a1 1 0 0 1-1 1A15 15 0 0 1 4 5a1 1 0 0 1 1-1z" /> },
];

export default function HomeClient() {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    let stale = false;
    Promise.all([
      getStats(),
      searchListings({ placement: 'top', per: '8' }),
      searchListings({ sort: 'new', plain: '1', per: '12' }),
      searchListings({ tour: '1', per: '4' }),
    ]).then(([stats, top, fresh, tours]) => { if (!stale) setData({ stats, top, fresh, tours }); });
    return () => { stale = true; };
  }, []);

  const [deal, setDeal] = useState<'sale' | 'rent'>('sale');
  const cnt = (d: string, c: string) => data?.stats.counts[`${d}:${c}`] || 0;
  const dealTotal = (d: string) => CAT_KEYS.reduce((n, k) => n + cnt(d, k), 0);
  const stat = (n: number | undefined) => (n === undefined ? '—' : n.toLocaleString('mn-MN'));
  return (
    <>
      <section className="hero">
        <HeroVideo src="/video/3d-video.mp4" />
        <div className="glass">
          <span className="eyebrow"><span className="pulse" />360° виртуал аялал</span>
          <h1>Байраа ирэхээсээ өмнө <em className="nowrap">360°-аар</em> үзээрэй</h1>
          <p>Орон сууц, хашаа байшин, газар, оффис — зарна, түрээслүүлнэ.</p>
          <HeroSearch />
          <dl className="hero-stats">
            <div><dt>Идэвхтэй зар</dt><dd>{stat(data?.stats.total)}</dd></div>
            <div><dt>360° аялалтай</dt><dd>{stat(data?.tours.total)}</dd></div>
            <div><dt>Дүүрэг</dt><dd>{DISTRICTS.length}</dd></div>
          </dl>
        </div>
        <a href="#browse" className="scroll-cue" aria-label="Доош гүйлгэх"><span /></a>
      </section>
      <section className="home-cats">
        <div className="section-head hc-head">
          <div>
            <span className="kicker">Ангилал</span>
            <h2>Үл хөдлөх хөрөнгө</h2>
            <p className="section-sub">Төрлөө сонгоод хайлтаа эхлүүлээрэй</p>
          </div>
          <div className="ftabs" role="tablist" aria-label="Гүйлгээний төрөл">
            {(['sale', 'rent'] as const).map((d) => (
              <button key={d} type="button" role="tab" aria-selected={deal === d} className={`ftab ${deal === d ? 'on' : ''}`} onClick={() => setDeal(d)}>
                <span>{d === 'sale' ? 'Зарна' : 'Түрээс'}</span>
                <span className="fcount">{data ? dealTotal(d) : '·'}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="hc-grid">
          {CAT_KEYS.map((k) => {
            const n = cnt(deal, k);
            return (
              <Link key={k} className={`hc-card ${data && !n ? 'is-empty' : ''}`} href={`/search?deal=${deal}&cat=${k}`}>
                <span className={`hc-ico ${CAT_ART[k] ? 'has-art' : ''}`}>{CAT_ART[k] ? <img src={CAT_ART[k]} alt="" loading="lazy" /> : <CatIcon cat={k} />}</span>
                <span className="hc-body">
                  <b>{CATS[k].name}</b>
                  <small>{data ? (n ? `${n} зар` : 'Зар алга') : '…'}</small>
                </span>
                <span className="hc-arrow" aria-hidden="true">→</span>
              </Link>
            );
          })}
        </div>
      </section>
      {!data ? <div className="loading">Ачаалж байна…</div> : <>
        {data.top.items.length > 0 && (
          <section className="block">
            <div className="section-head">
              <div><span className="kicker">Онцлох</span><h2>Онцгой зар</h2><p className="section-sub">Зар оруулагчдын онцолсон, хамгийн их хандалттай зарууд.</p></div>
            </div>
            <Grid items={data.top.items.slice(0, 4)} className="grid-feature" />
          </section>
        )}
        <section className="block">
          <div className="section-head">
            <div><span className="kicker">Шинэ</span><h2>Шинэ зар</h2><p className="section-sub">Сүүлд нэмэгдсэн зарууд.</p></div>
            <Link className="more" href="/search?sort=new">Бүгдийг харах →</Link>
          </div>
          {/* featured ones are already shown above, so skip them here */}
          <Grid items={data.fresh.items.filter((l) => !data.top.items.some((t) => t.id === l.id)).slice(0, 8)} />
        </section>
      </>}

      <section className="block">
        <div className="section-head">
          <div><span className="kicker">Хэрхэн ажилладаг</span><h2>Гурван алхмаар байраа олоорой</h2></div>
        </div>
        <ol className="how">
          {STEPS.map((s, i) => (
            <li key={s.title} className="how-step">
              <span className="how-step-n">{String(i + 1).padStart(2, '0')}</span>
              <span className="how-step-ico" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">{s.icon}</svg>
              </span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {data && data.tours.items.length > 0 && (
        <section className="block">
          <div className="section-head">
            <div><span className="kicker">360°</span><h2>360° аялалтай зар</h2><p className="section-sub">Очихгүйгээр өрөө бүрийг нь үзэх боломжтой зарууд.</p></div>
            <Link className="more" href="/search?tour=1">Бүгдийг харах →</Link>
          </div>
          <Grid items={data.tours.items} />
        </section>
      )}

      <section className="cta">
        <div>
          <h2>Зараа 360° аялалтай байршуулаарай</h2>
          <p>Өрөө бүрээс утсаараа 10–14 зураг аваад л болно — бид холбож 360° аялал болгоно.</p>
        </div>
        <div className="cta-actions">
          <Link href="/post" className="btn btn-primary">+ Зар нэмэх</Link>
          <Link href="/help" className="btn">Зураг авах заавар</Link>
        </div>
      </section>
    </>
  );
}
