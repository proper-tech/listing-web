import type { Metadata } from 'next';
import PostWizard from '@/components/PostWizard';
import RequireUser from '@/components/RequireUser';

export const metadata: Metadata = { title: 'Зар нэмэх' };

export default function PostPage() {
  return <RequireUser roles={['agent', 'admin']} path="/post"><PostWizard /></RequireUser>;
}
