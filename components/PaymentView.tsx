'use client';
// QPay payment for an agent's listing: price breakdown, QR code (scan with any bank app), bank-app buttons on phones,
// and a live status that turns into "paid" by itself (the server re-checks QPay; QPay's callback also marks it).
// In test mode (no QPay keys: provider 'mock') a "Туршилтын төлбөр" button stands in for the bank app.
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getListing } from '@/lib/api/listings';
import { getPayment, mockPay, startPayment, type Payment } from '@/lib/api/payments';
import type { Listing } from '@/lib/types';
import { fmtFull } from '@/lib/format';
import { NOIMG } from '@/lib/constants';
import { useToast } from './Toast';
import Icon from './Icon';
import LoadError from './LoadError';
import PageLoader from './PageLoader';

const POLL_MS = 3000;

export default function PaymentView({ postId }: { postId: string }) {
  const toast = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // the listing (title, photo) and its invoice
  useEffect(() => {
    let stale = false;
    setError('');
    Promise.all([getListing(postId), startPayment(postId)]).then(([l, r]) => {
      if (stale) return;
      setListing(l);
      if (r.payment) setPayment(r.payment);
      if (r.paid) setPaid(true);
    }).catch((e) => { if (!stale) setError((e as Error).message); });
    return () => { stale = true; };
  }, [postId, attempt]);

  // while waiting, ask the server every few seconds (it checks QPay); pauses when the tab is hidden
  const paymentId = payment?.status === 'pending' ? payment.id : null;
  const polling = useRef(false);
  const check = useCallback(async () => {
    if (!paymentId || polling.current || document.hidden) return;
    polling.current = true;
    try {
      const p = await getPayment(paymentId);
      setPayment(p);
      if (p.status === 'paid') setPaid(true);
    } catch { /* network blip: the next tick tries again */ }
    polling.current = false;
  }, [paymentId]);
  useEffect(() => {
    if (!paymentId || paid) return;
    const t = setInterval(check, POLL_MS);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', check); };
  }, [paymentId, paid, check]);

  const onMockPay = async () => {
    if (!payment) return;
    setBusy(true);
    try { const p = await mockPay(payment.id); setPayment(p); setPaid(p.status === 'paid'); }
    catch (e) { toast((e as Error).message); }
    setBusy(false);
  };

  if (error) return <div className="pay"><LoadError message={error} onRetry={() => setAttempt((a) => a + 1)} /></div>;
  if (!listing || (!payment && !paid)) return <PageLoader label="Нэхэмжлэх бэлдэж байна…" />;

  if (paid) {
    return (
      <div className="panel done-card pay-done" role="status">
        <Icon name="check" size={48} className="icon-feature icon-success" />
        <h1>Төлбөр амжилттай</h1>
        <p>
          {payment ? <><b>{fmtFull(payment.amount)}</b> төлөгдлөө. </> : null}
          «{listing.title}» зарыг админ шалгаж баталсны дараа нийтэд харагдана.
        </p>
        <p className="row-wrap pay-done-actions">
          <Link className="btn btn-primary" href="/my">Миний зар</Link>
          <Link className="btn" href="/post">Шинэ зар нэмэх</Link>
        </p>
      </div>
    );
  }

  const p = payment!;
  const mock = p.provider === 'mock';
  return (
    <div className="pay">
      <div className="pay-head">
        <h1>Төлбөр төлөх</h1>
        <p className="muted">Төлбөр орсны дараа зар тань админы хяналт руу автоматаар илгээгдэнэ.</p>
      </div>
      <div className="pay-grid">
        <section className="panel pay-summary">
          <div className="pay-listing">
            <img src={listing.photos[0]?.src || NOIMG} alt="" />
            <div className="min-w-0"><b className="pay-title">{listing.title}</b><div className="muted small">Зарын дугаар {listing.id}</div></div>
          </div>
          <dl className="pay-items">
            {p.items.map((it) => <div key={it.code}><dt>{it.label}</dt><dd>{fmtFull(it.amount)}</dd></div>)}
            <div className="pay-total"><dt>Нийт</dt><dd>{fmtFull(p.amount)}</dd></div>
          </dl>
          <p className="muted small mb-0">Татгалзсан зарыг засаад дахин илгээхэд дахин төлөхгүй.</p>
        </section>

        <section className="panel pay-qr">
          <div className="pay-status" aria-live="polite"><span className="pay-dot" aria-hidden="true" />Төлбөр хүлээж байна…</div>
          {mock ? (
            <div className="pay-mock">
              <div className="pay-qr-img pay-qr-mock" aria-hidden="true"><Icon name="alert" size={28} /></div>
              <p className="small"><b>Туршилтын горим.</b> QPay холбогдоогүй тул жинхэнэ төлбөр авахгүй. Доорх товч нь банкны аппаар төлсөнтэй адил ажиллана.</p>
              <button className="btn btn-primary btn-block" disabled={busy} onClick={onMockPay}>{busy ? 'Төлж байна…' : `Туршилтын төлбөр (${fmtFull(p.amount)})`}</button>
            </div>
          ) : <>
            {p.qrImage
              ? <img className="pay-qr-img" src={`data:image/png;base64,${p.qrImage}`} alt="QPay QR код" width={240} height={240} />
              : <div className="pay-qr-img pay-qr-mock">QR</div>}
            <p className="small pay-qr-help">Банкны аппаараа (Хаан, Голомт, ХХБ, Төрийн банк…) QR кодыг уншуулж төлнө үү.</p>
            {p.links.length > 0 && <>
              <div className="pay-or"><span>эсвэл утсаараа</span></div>
              <div className="pay-banks">
                {p.links.map((b) => (
                  <a key={b.name + b.link} className="pay-bank" href={b.link}>
                    {b.logo && <img src={b.logo} alt="" loading="lazy" />}<span>{b.description || b.name}</span>
                  </a>
                ))}
              </div>
            </>}
            {p.shortUrl && <p className="small mt-3"><a href={p.shortUrl} target="_blank" rel="noopener noreferrer">QPay хуудсанд нээх <Icon name="external" size={13} /></a></p>}
          </>}
          <button type="button" className="btn btn-sm mt-3" onClick={check}>Төлсөн, шалгах</button>
        </section>
      </div>
    </div>
  );
}
