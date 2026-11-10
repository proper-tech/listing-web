import type { Metadata } from 'next';
import { CATS } from '@/lib/constants';
import { fmtPrice } from '@/lib/format';
import { seedListings } from '@/lib/mock/seed';
import ListingView from '@/components/ListingView';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tour?: string }> };

// The mock data lives in the browser; metadata can only describe the built-in demo listings.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const l = seedListings().find((x) => x.id === id);
  if (!l) return { title: `Зар ${id}` };
  const desc = `${fmtPrice(l.price)} · ${CATS[l.category].name} · ${l.location.district}. ${(l.description || '').slice(0, 140)}`;
  return { title: l.title, description: desc, openGraph: { title: l.title, description: desc, images: l.photos[0] ? [l.photos[0].src] : [] } };
}

export default async function ListingPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tour } = await searchParams;
  return <ListingView key={id} id={id} startWithTour={tour === '1'} />;
}
