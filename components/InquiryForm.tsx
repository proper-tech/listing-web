'use client';
import { useState } from 'react';
import { normPhone, sendInquiry } from '@/lib/mock/api';
import { useToast } from './Toast';

type Errors = Partial<Record<'name' | 'phone' | 'email' | 'message', string>>;

/** Зарын хуудсан дээрх "Энэ зарын талаар холбогдох" форм. Хүсэлт зар оруулагчийн "Миний зар" хуудсанд очно. */
export default function InquiryForm({ id }: { id: string; title?: string }) {
  const toast = useToast();
  const [f, setF] = useState({ name: '', phone: '', email: '', message: '' });
  const [err, setErr] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setF((x) => ({ ...x, [k]: e.target.value }));
    if (err[k]) setErr((x) => ({ ...x, [k]: undefined }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (f.name.trim().length < 2) e.name = 'Нэрээ оруулна уу.';
    if (!normPhone(f.phone)) e.phone = 'Утасны дугаар 8 оронтой байна.';
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Имэйл хаяг буруу байна.';
    if (f.message.trim().length < 5) e.message = 'Мессежээ бичнэ үү.';
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await sendInquiry(id, f);
      setSent(true);
      toast('Хүсэлт илгээгдлээ');
    } catch (x) {
      toast((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="panel inq inq-done" role="status">
        <div className="inq-ok" aria-hidden="true">✓</div>
        <h3>Хүсэлт илгээгдлээ</h3>
        <p className="muted small">Зар оруулагч тантай <b>{normPhone(f.phone)}</b> дугаараар холбогдоно.</p>
        <button type="button" className="btn btn-sm" onClick={() => { setSent(false); setF((x) => ({ ...x, message: '' })); }}>Дахин бичих</button>
      </div>
    );
  }

  const field = (k: keyof Errors, label: string, input: React.ReactNode) => (
    <label className={`inq-field ${err[k] ? 'has-err' : ''}`}>
      <span>{label}</span>
      {input}
      {err[k] && <small className="inq-err">{err[k]}</small>}
    </label>
  );

  return (
    <form className="panel inq" onSubmit={submit} noValidate>
      <h3>Энэ зарын талаар холбогдох</h3>
      {field('name', 'Нэр *', <input type="text" value={f.name} onChange={set('name')} placeholder="Таны нэр" autoComplete="name" maxLength={60} aria-invalid={!!err.name} />)}
      {field('phone', 'Утас *', <input type="tel" value={f.phone} onChange={set('phone')} placeholder="9911 2233" autoComplete="tel" inputMode="tel" maxLength={16} aria-invalid={!!err.phone} />)}
      {field('email', 'Имэйл', <input type="email" value={f.email} onChange={set('email')} placeholder="tanii@email.mn" autoComplete="email" maxLength={254} aria-invalid={!!err.email} />)}
      {field('message', 'Мессеж *', <textarea value={f.message} onChange={set('message')} rows={4} placeholder="Энэ байрыг сонирхож байна…" maxLength={1000} aria-invalid={!!err.message} />)}
      <button type="submit" className="btn btn-primary btn-block inq-send" disabled={busy}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3Z" /></svg>
        {busy ? 'Илгээж байна…' : 'Хүсэлт илгээх'}
      </button>
    </form>
  );
}
