import type { Metadata } from 'next';
import AdminPanel from '@/components/AdminPanel';
import { requirePageUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Админ самбар' };

export default async function AdminPage() {
  const user = await requirePageUser(['admin'], '/admin');
  return <AdminPanel meId={user.id} />;
}
