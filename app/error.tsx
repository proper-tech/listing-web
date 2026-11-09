'use client';
import Link from 'next/link';

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="empty">
      ⚠️ {error.message}
      <br /><br />
      <button className="btn" onClick={reset}>Дахин оролдох</button> <Link href="/">Нүүр хуудас</Link>
    </div>
  );
}
