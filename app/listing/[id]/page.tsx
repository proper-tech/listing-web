import type { Metadata } from 'next';
import { CATS } from '@/lib/constants';
import { fmtPrice } from '@/lib/format';
import { toListing, type ApiPost } from '@/lib/api/listings';
import ListingView from '@/components/ListingView';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tour?: string }> };

// Title and preview card for shared links. Only active posts are public, so drafts/pending get a plain title.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const fallback = { title: `Зар ${id}` };
  if (!/^\d+$/.test(id)) return fallback;
  try {
    const res = await fetch(`${process.env.API_URL || 'http://localhost:4000'}/api/posts/${id}?view=0`, { next: { revalidate: 300 } });
    if (!res.ok) return fallback;
    const l = toListing(((await res.json()) as { post: ApiPost }).post);
    const desc = `${fmtPrice(l.price)} · ${CATS[l.category].name} · ${l.location.district}. ${(l.description || '').slice(0, 140)}`;
    return { title: l.title, description: desc, openGraph: { title: l.title, description: desc, images: l.photos[0] ? [l.photos[0].src] : [] } };
  } catch {
    return fallback; // API down: the page itself still loads and shows its own error
  }
}

export default async function ListingPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tour } = await searchParams;
  return <ListingView key={id} id={id} startWithTour={tour === '1'} />;
}
