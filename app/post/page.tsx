import type { Metadata } from 'next';
import PostWizard from '@/components/PostWizard';

export const metadata: Metadata = { title: 'Зар нэмэх' };

export default function PostPage() {
  return <PostWizard />;
}
