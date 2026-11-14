'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { markInquiryRead, myInquiries } from '@/lib/api/inquiries';
import type { InquiryWithListing } from '@/lib/types';
import { timeAgo } from '@/lib/format';
import PageLoader from '@/components/PageLoader';
import Icon from './Icon';

/** "Миний зар" хуудсан дээр: зарууд руу ирсэн холбоо барих хүсэлтүүд. */
export default function InquiryInbox() {
  const [items, setItems] = useState<InquiryWithListing[] | null>(null);
  useEffect(() => {
    let stale = false;
    myInquiries().then((r) => { if (!stale) setItems(r); }).catch(() => { if (!stale) setItems([]); });
    return () => { stale = true; };
  }, []);

  const open = (q: InquiryWithListing) => {
    if (q.read) return;
    setItems((x) => x && x.map((y) => (y.id === q.id ? { ...y, read: true } : y)));
    markInquiryRead(q.id).catch(() => {});
  };
  const unread = items?.filter((q) => !q.read).length ?? 0;

  return (
    <section className="inbox">
      <div className="section-head mt-6">
        <h2>Ирсэн хүсэлтүүд {unread > 0 && <span className="inbox-badge">{unread} шинэ</span>}</h2>
      </div>
      {!items ? <PageLoader /> : !items.length ? (
        <div className="empty">Одоогоор хүсэлт ирээгүй байна. Худалдан авагчид зарын хуудсан дээрх формоор тантай холбогдоно.</div>
      ) : (
        <ul className="inbox-list">
          {items.map((q) => (
            <li key={q.id}>
              <details className={q.read ? '' : 'unread'} onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) open(q); }}>
                <summary>
                  <span className="inbox-dot" aria-hidden="true" />
                  <b>{q.name}</b>
                  <span className="inbox-title">{q.listingTitle}</span>
                  <span className="muted small">{timeAgo(q.createdAt)}</span>
                </summary>
                <div className="inbox-body">
                  <p>{q.message}</p>
                  <div className="inbox-actions">
                    <a className="btn btn-sm btn-primary" href={`tel:${q.phone}`}><Icon name="phone" /> {q.phone}</a>
                    {q.email && <a className="btn btn-sm" href={`mailto:${q.email}`}><Icon name="mail" /> {q.email}</a>}
                    <Link className="btn btn-sm" href={`/listing/${q.listingId}`}>Зарыг харах</Link>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
