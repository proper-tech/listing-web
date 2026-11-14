'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { markInquiryRead, myInquiries } from '@/lib/api/inquiries';
import type { InquiryWithListing } from '@/lib/types';
import { timeAgo } from '@/lib/format';
import PageLoader from '@/components/PageLoader';
import Icon from './Icon';

/** 8 оронтой дугаарыг уншихад хялбар болгоно: 80779382 → 8077 9382. */
const fmtPhone = (p: string) => (/^\d{8}$/.test(p) ? `${p.slice(0, 4)} ${p.slice(4)}` : p);
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

/** "Миний зар" хуудсан дээр: зарууд руу ирсэн холбоо барих хүсэлтүүд. */
export default function InquiryInbox() {
  const [items, setItems] = useState<InquiryWithListing[] | null>(null);
  useEffect(() => {
    let stale = false;
    myInquiries().then((r) => { if (!stale) setItems(r); }).catch(() => { if (!stale) setItems([]); });
    return () => { stale = true; };
  }, []);

  const markRead = (q: InquiryWithListing) => {
    if (q.read) return;
    setItems((x) => x && x.map((y) => (y.id === q.id ? { ...y, read: true } : y)));
    markInquiryRead(q.id).catch(() => {});
  };
  const unread = items?.filter((q) => !q.read).length ?? 0;

  return (
    <section className="inbox">
      <div className="inbox-head">
        <div>
          <h2>Ирсэн хүсэлтүүд</h2>
          <p className="muted small">Худалдан авагчид зарын хуудсан дээрх формоор илгээсэн хүсэлтүүд.</p>
        </div>
        {items && items.length > 0 && (
          <div className="inbox-stats">
            <span><b>{items.length}</b> нийт</span>
            {unread > 0 && <span className="inbox-new"><b>{unread}</b> шинэ</span>}
          </div>
        )}
      </div>

      {!items ? <PageLoader /> : !items.length ? (
        <div className="inbox-empty">
          <span className="inbox-empty-ico"><Icon name="mail" size={22} /></span>
          <b>Одоогоор хүсэлт ирээгүй байна</b>
          <p className="muted small">Худалдан авагч зарын хуудсан дээрх формыг бөглөхөд энд харагдана.</p>
        </div>
      ) : (
        <ul className="inbox-list">
          {items.map((q) => (
            <li key={q.id} className={`inq-card ${q.read ? '' : 'unread'}`} onClick={() => markRead(q)}>
              <div className="inq-card-top">
                <span className="inq-avatar" aria-hidden="true">{initials(q.name)}</span>
                <div className="inq-who">
                  <div className="inq-name">
                    <b>{q.name}</b>
                    {!q.read && <span className="inq-pill">Шинэ</span>}
                  </div>
                  <Link className="inq-listing" href={`/listing/${q.listingId}`} title={q.listingTitle}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11 12 4l8 7v8.5a.5.5 0 0 1-.5.5H15v-6H9v6H4.5a.5.5 0 0 1-.5-.5V11Z" /></svg>
                    <span>{q.listingTitle}</span>
                  </Link>
                </div>
                <time className="inq-time" dateTime={q.createdAt}>{timeAgo(q.createdAt)}</time>
              </div>

              <p className="inq-msg">{q.message}</p>

              <div className="inq-actions">
                <a className="inq-btn inq-btn-call" href={`tel:${q.phone}`} onClick={() => markRead(q)}>
                  <Icon name="phone" size={16} /><span>{fmtPhone(q.phone)}</span>
                </a>
                {q.email && (
                  <a className="inq-btn" href={`mailto:${q.email}`} onClick={() => markRead(q)}>
                    <Icon name="mail" size={16} /><span>{q.email}</span>
                  </a>
                )}
                <Link className="inq-link" href={`/listing/${q.listingId}`}>
                  Зарыг харах
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
