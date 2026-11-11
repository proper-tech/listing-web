'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Category, SearchResult, Stats } from '@/lib/types';
import { CATS, CAT_KEYS, DISTRICTS } from '@/lib/constants';
import { getStats, searchListings } from '@/lib/mock/api';
import { Grid } from './ListingCard';
import HeroSearch from './HeroSearch';
import HeroVideo from './HeroVideo';
import CatIcon from './CatIcon';

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
  const [deal, setDeal] = useState<Deal>('sale');
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

  const cnt = (c: string) => data?.stats.counts[`${deal}:${c}`] || 0;
  const dealTotal = (d: Deal) => CAT_KEYS.reduce((n, k) => n + (data?.stats.counts[`${d}:${k}`] || 0), 0);
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

      <section id="browse" className="block">
        <div className="section-head">
          <div>
            <span className="kicker">Ангилал</span>
            <h2>Юу хайж байна вэ?</h2>
            <p className="section-sub">Төрлөө сонгоод тухайн ангиллын бүх зарыг үзээрэй.</p>
          </div>
          <div className="seg" role="tablist" aria-label="Зарын төрөл">
            {(['sale', 'rent'] as const).map((d) => (
              // a deal type with no listings at all can't be picked
              <button key={d} type="button" role="tab" aria-selected={deal === d} className={deal === d ? 'on' : ''}
                disabled={!!data && !dealTotal(d)}
                onClick={() => setDeal(d)}>{d === 'sale' ? 'Зарна' : 'Түрээслүүлнэ'}</button>
            ))}
          </div>
        </div>
        <div className="cats">
          {CAT_KEYS.map((k) => {
            const inner = <>
              <b>{CATS[k].name}</b>
              <span className="n">{data ? `${cnt(k)} зар` : '…'}</span>
              {CAT_ART[k]
                ? <img className="cat-art" src={CAT_ART[k]} alt="" loading="lazy" />
                : <span className="cat-art cat-art-icon" aria-hidden="true"><CatIcon cat={k} size={64} /></span>}
            </>;
            // no listings in this category for the chosen deal type: show the tile greyed out and not clickable
            return data && !cnt(k)
              ? <div key={k} className="cat is-empty" aria-disabled="true">{inner}</div>
              : <Link key={k} className="cat" href={`/search?deal=${deal}&cat=${k}`}>{inner}</Link>;
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
