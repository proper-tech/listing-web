import type { Metadata } from 'next';
import PostWizard from '@/components/PostWizard';
import { requirePageUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Зар нэмэх' };

export default async function PostPage() {
  const user = await requirePageUser(['agent', 'admin'], '/post');
  return <PostWizard user={user} />;
}
