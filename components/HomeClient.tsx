'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { SearchResult, Stats } from '@/lib/types';
import { CATS, CAT_KEYS } from '@/lib/constants';
import { getStats, searchListings } from '@/lib/mock/api';
import { Grid } from './ListingCard';
import HeroSearch from './HeroSearch';

type Data = { stats: Stats; top: SearchResult; fresh: SearchResult; tours: SearchResult };

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

  const cnt = (deal: string, c: string) => data?.stats.counts[`${deal}:${c}`] || 0;
  const cats = (deal: 'sale' | 'rent') => (
    <div className="cats">
      {CAT_KEYS.map((k) => (
        <Link key={k} className="cat" href={`/search?deal=${deal}&cat=${k}`}>
          <span className="ico">{CATS[k].ico}</span><b>{CATS[k].name}</b><span className="muted small">{data ? `${cnt(deal, k)} зар` : '…'}</span>
        </Link>
      ))}
    </div>
  );
  return (
    <>
      <section className="hero">
        <h1>Байраа ирэхээсээ өмнө 360°-аар үзээрэй</h1>
        <p>{data ? `${data.stats.total} идэвхтэй зар` : 'Идэвхтэй зарууд'} · Орон сууц, хашаа байшин, газар, оффис</p>
        <HeroSearch />
      </section>
      <h2>Үл хөдлөх зарна</h2>
      {cats('sale')}
      <h2>Үл хөдлөх түрээслүүлнэ</h2>
      {cats('rent')}
      {!data ? <div className="loading">Ачаалж байна…</div> : <>
        {data.top.items.length > 0 && <><div className="section-head"><h2>Онцгой зар</h2></div><Grid items={data.top.items} /></>}
        <div className="section-head"><h2>Шинэ зар</h2><Link href="/search?sort=new">Бүгдийг харах →</Link></div>
        <Grid items={data.fresh.items} />
        <div className="section-head"><h2>360° аялалтай зар</h2><Link href="/search?tour=1">Бүгдийг харах →</Link></div>
        <Grid items={data.tours.items} />
      </>}
    </>
  );
}
