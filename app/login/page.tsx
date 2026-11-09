import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser, homeFor, safeNext } from '@/lib/session';
import LoginForm from '@/components/LoginForm';

export const metadata: Metadata = { title: 'Нэвтрэх' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(user.mustChangePassword ? '/account' : safeNext(next, homeFor(user)));
  return <LoginForm next={safeNext(next, '')} />;
}
