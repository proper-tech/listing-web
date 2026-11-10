import type { Metadata } from 'next';
import SearchClient from '@/components/SearchClient';

export const metadata: Metadata = { title: 'Зар хайх' };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === 'string' && v) q.set(k, v);
  // key: a new navigation (e.g. header "Түрээс" link) starts with fresh client state
  return <SearchClient key={q.toString()} initialQuery={q.toString()} />;
}
