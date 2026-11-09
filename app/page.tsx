import Link from 'next/link';
import { serverApi } from '@/lib/api';
import type { SearchResult, Stats } from '@/lib/types';
import { CATS, CAT_KEYS } from '@/lib/constants';
import { Grid } from '@/components/ListingCard';
import HeroSearch from '@/components/HeroSearch';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [stats, top, fresh, tours] = await Promise.all([
    serverApi<Stats>('/api/stats'),
    serverApi<SearchResult>('/api/listings?placement=top&per=8'),
    serverApi<SearchResult>('/api/listings?sort=new&plain=1&per=12'),
    serverApi<SearchResult>('/api/listings?tour=1&per=4'),
  ]);
  const cnt = (deal: string, c: string) => stats.counts[`${deal}:${c}`] || 0;
  const cats = (deal: 'sale' | 'rent') => (
    <div className="cats">
      {CAT_KEYS.map((k) => (
        <Link key={k} className="cat" href={`/search?deal=${deal}&cat=${k}`}>
          <span className="ico">{CATS[k].ico}</span><b>{CATS[k].name}</b><span className="muted small">{cnt(deal, k)} зар</span>
        </Link>
      ))}
    </div>
  );
  return (
    <>
      <section className="hero">
        <h1>Байраа ирэхээсээ өмнө 360°-аар үзээрэй</h1>
        <p>{stats.total} идэвхтэй зар · Орон сууц, хашаа байшин, газар, оффис</p>
        <HeroSearch />
      </section>
      <h2>Үл хөдлөх зарна</h2>
      {cats('sale')}
      <h2>Үл хөдлөх түрээслүүлнэ</h2>
      {cats('rent')}
      {top.items.length > 0 && <><div className="section-head"><h2>Онцгой зар</h2></div><Grid items={top.items} /></>}
      <div className="section-head"><h2>Шинэ зар</h2><Link href="/search?sort=new">Бүгдийг харах →</Link></div>
      <Grid items={fresh.items} />
      <div className="section-head"><h2>360° аялалтай зар</h2><Link href="/search?tour=1">Бүгдийг харах →</Link></div>
      <Grid items={tours.items} />
    </>
  );
}
