import type { Metadata } from 'next';
import PostWizard from '@/components/PostWizard';
import RequireUser from '@/components/RequireUser';

export const metadata: Metadata = { title: 'Зар засах' };

// Admin-only: edit an existing listing with the post wizard (prefilled, no payment step).
export default async function AdminEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RequireUser roles={['admin']} path={`/admin/edit/${id}`}><PostWizard key={id} editId={id} /></RequireUser>;
}
