'use client';
import Link from 'next/link';
import Icon from '@/components/Icon';

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="empty">
      <Icon name="alert" size={28} className="icon-feature" />
      <div>{error.message}</div>
      <br /><br />
      <button className="btn" onClick={reset}>Дахин оролдох</button> <Link href="/">Нүүр хуудас</Link>
    </div>
  );
}
