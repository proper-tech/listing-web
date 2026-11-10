import type { Metadata } from 'next';
import AdminPanel from '@/components/AdminPanel';
import RequireUser from '@/components/RequireUser';

export const metadata: Metadata = { title: 'Админ самбар' };

export default function AdminPage() {
  return <RequireUser roles={['admin']} path="/admin"><AdminPanel /></RequireUser>;
}
