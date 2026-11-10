import type { Metadata } from 'next';
import { safeNext } from '@/lib/session';
import LoginForm from '@/components/LoginForm';

export const metadata: Metadata = { title: 'Нэвтрэх' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginForm next={safeNext(next, '')} />;
}
