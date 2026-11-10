import type { Metadata } from 'next';
import { safeNext } from '@/lib/session';
import Account from '@/components/Account';

export const metadata: Metadata = { title: 'Миний бүртгэл' };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <Account next={safeNext(next, '')} />;
}
