'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from './Toast';
import FavButton from './FavButton';

export function PhoneAndFav({ id, title }: { id: string; title: string }) {
  const toast = useToast();
  const [phone, setPhone] = useState<string | null>(null);
  const reveal = async () => {
    try { setPhone((await api<{ phone: string }>(`/api/listings/${id}/phone`)).phone); } catch (e) { toast((e as Error).message); }
  };
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); toast('Холбоосыг хууллаа'); }
    } catch { /* cancelled */ }
  };
  return (
    <>
      {phone
        ? <a className="btn btn-primary btn-block" href={`tel:${phone}`}>📞 {phone.replace(/(\d{4})(\d{4})/, '$1-$2')}</a>
        : <button className="btn btn-primary btn-block" onClick={reveal}>📞 Утасны дугаар харах</button>}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <FavButton id={id} variant="button" />
        <button className="btn btn-block" onClick={share}>↗ Хуваалцах</button>
      </div>
    </>
  );
}

const REASONS: [string, string][] = [['fake', 'Хуурамч зар'], ['duplicate', 'Давхардсан'], ['wrong_price', 'Үнэ буруу'], ['sold', 'Зарагдсан'], ['other', 'Бусад']];

export function ReportButton({ id }: { id: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const send = async (reason: string) => {
    try { await api(`/api/listings/${id}/report`, { method: 'POST', body: JSON.stringify({ reason }) }); setDone(true); setOpen(false); toast('Баярлалаа! Админ шалгана.'); }
    catch (e) { toast((e as Error).message); }
  };
  if (done) return <p className="muted small" style={{ marginTop: 10 }}>Мэдээлэл илгээгдсэн.</p>;
  return (
    <div style={{ marginTop: 10 }}>
      <button className="btn btn-sm btn-danger" onClick={() => setOpen((o) => !o)}>⚑ Зарыг мэдээлэх</button>
      {open && <div className="chips" style={{ marginTop: 8 }}>{REASONS.map(([k, n]) => <button key={k} className="chip" onClick={() => send(k)}>{n}</button>)}</div>}
    </div>
  );
}
