import type { Metadata } from 'next';
import MyAds from '@/components/MyAds';
import { requirePageUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Миний зар' };

export default async function MyPage() {
  await requirePageUser(['agent', 'admin'], '/my');
  return <MyAds />;
}
