'use client';
import { useEffect, useState } from 'react';
import { getPhone } from '@/lib/api/listings';
import { reportListing } from '@/lib/api/admin';
import { REPORT_REASON_MN } from '@/lib/constants';
import { useToast } from './Toast';
import FavButton from './FavButton';
import Icon from './Icon';
import ShareDialog from './ShareDialog';

export function PhoneAndFav({ id, title, image }: { id: string; title: string; image?: string }) {
  const toast = useToast();
  const [phone, setPhone] = useState<string | null>(null);
  // Утасны дугаарыг зар нээгдэхэд шууд харуулна (товч дарах шаардлагагүй).
  useEffect(() => {
    let stale = false;
    setPhone(null);
    getPhone(id).then((p) => { if (!stale) setPhone(p); }).catch((e) => { if (!stale) toast((e as Error).message); });
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  // Хуваалцах: сайтын өөрийн загвартай цонх (ShareDialog)
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const share = () => { setShareUrl(window.location.href.split('#')[0]); setShareOpen(true); };
  return (
    <>
      {phone
        ? <a className="btn btn-primary btn-block" href={`tel:${phone}`}><Icon name="phone" /> {phone.replace(/(\d{4})(\d{4})/, '$1-$2')}</a>
        : <div className="btn btn-block" aria-busy="true"><Icon name="phone" /> Ачаалж байна…</div>}
      <div className="row-2 mt-2">
        <FavButton id={id} variant="button" />
        <button className="btn btn-block" onClick={share}><Icon name="share" /> Хуваалцах</button>
      </div>
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} title={title} url={shareUrl} image={image} />
    </>
  );
}

const REASONS = Object.entries(REPORT_REASON_MN);

export function ReportButton({ id }: { id: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const send = async (reason: string) => {
    try { await reportListing(id, reason); setDone(true); setOpen(false); toast('Баярлалаа! Админ шалгана.'); }
    catch (e) { toast((e as Error).message); }
  };
  if (done) return <p className="muted small mt-3">Мэдээлэл илгээгдсэн.</p>;
  return (
    <div className="mt-3">
      <button className="btn btn-sm btn-danger" onClick={() => setOpen((o) => !o)}><Icon name="flag" /> Зарыг мэдээлэх</button>
      {open && <div className="chips mt-2">{REASONS.map(([k, n]) => <button key={k} className="chip" onClick={() => send(k)}>{n}</button>)}</div>}
    </div>
  );
}
