import type { Metadata } from 'next';
import MyAds from '@/components/MyAds';
import RequireUser from '@/components/RequireUser';

export const metadata: Metadata = { title: 'Миний зар' };

export default function MyPage() {
  return <RequireUser roles={['agent', 'admin']} path="/my"><MyAds /></RequireUser>;
}
