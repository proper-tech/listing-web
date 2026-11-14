'use client';
import { useEffect, useRef, useState } from 'react';
import { useToast } from './Toast';

/* Сайтын өөрийн загвартай "Зар хуваалцах" цонх (Windows / хөтчийн цонхны оронд).
   Instagram, Messenger (компьютер дээр) холбоос хүлээж авдаггүй тул холбоосыг хуулаад апп/сайтыг нээнэ. */

const enc = encodeURIComponent;
type Ctx = { url: string; text: string; mobile: boolean };
type Target = {
  key: string; label: string; bg: string; icon?: React.ReactNode;
  art?: React.ReactNode;             // албан ёсны лого (өөрийн өнгөтэй)
  shape?: string;                    // нэмэлт класс (дөрвөлжин г.м.)
  href?: (c: Ctx) => string;         // шууд хуваалцах холбоос
  copyOpen?: (c: Ctx) => string;     // холбоосыг хуулаад энэ хаягийг нээнэ
  hint?: string;
};

const TARGETS: Target[] = [
  { key: 'facebook', label: 'Facebook', bg: '#ffffff', shape: 'sh-ico-app', href: (c) => `https://www.facebook.com/sharer/sharer.php?u=${enc(c.url)}`,
    art: <svg className="sh-art" viewBox="0 0 24 24" aria-hidden="true"><path fill="#0866ff" d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" /></svg> },
  { key: 'messenger', label: 'Messenger', bg: 'linear-gradient(135deg,#00b2ff 0%,#7a3cff 55%,#ff5c87 100%)',
    href: (c) => (c.mobile ? `fb-messenger://share/?link=${enc(c.url)}` : ''), copyOpen: () => 'https://www.messenger.com/', hint: 'Messenger-д буулгаад илгээнэ үү',
    icon: <path fill="currentColor" stroke="none" d="M12 3C7 3 3 6.7 3 11.3c0 2.6 1.3 5 3.4 6.5V21l3.1-1.7c.8.2 1.6.3 2.5.3 5 0 9-3.7 9-8.3S17 3 12 3Zm.9 11.1-2.3-2.4-4.4 2.4 4.9-5.2 2.3 2.4 4.4-2.4-4.9 5.2Z" /> },
  { key: 'instagram', label: 'Instagram', bg: 'radial-gradient(circle at 30% 107%,#fdf497 0%,#fdf497 5%,#fd5949 45%,#d6249f 60%,#285aeb 90%)', shape: 'sh-ico-sq',
    copyOpen: () => 'https://www.instagram.com/direct/inbox/', hint: 'Instagram-ийн чат эсвэл story-д буулгана уу',
    art: <svg className="sh-art-ig" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5.5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.4" cy="6.6" r="1.25" fill="#fff" stroke="none" /></svg> },
  { key: 'whatsapp', label: 'WhatsApp', bg: '#25d366', href: (c) => `https://wa.me/?text=${enc(`${c.text} ${c.url}`)}`,
    icon: <><path d="M4 20l1.2-3.6A8 8 0 1 1 8 19.2L4 20Z" /><path d="M9 8.8c0 3.3 2.9 6.2 6.2 6.2l1-1.4-1.9-1-1 .8a4 4 0 0 1-2.7-2.7l.8-1-1-1.9L9 8.8Z" fill="currentColor" stroke="none" /></> },
  { key: 'telegram', label: 'Telegram', bg: '#229ed9', href: (c) => `https://t.me/share/url?url=${enc(c.url)}&text=${enc(c.text)}`,
    icon: <path fill="currentColor" stroke="none" d="M20.7 4.3 3.4 11c-1.2.5-1.2 1.2-.2 1.5l4.4 1.4 1.7 5.2c.2.6.1.8.7.8.5 0 .7-.2 1-.5l2.1-2.1 4.5 3.3c.8.5 1.4.2 1.6-.8l2.9-13.7c.3-1.2-.4-1.8-1.4-1.3ZM9.3 14.2l8.4-5.3c.4-.3.8-.1.5.2l-7 6.4-.3 3-1.6-4.3Z" /> },
  { key: 'viber', label: 'Viber', bg: '#7360f2', href: (c) => `viber://forward?text=${enc(`${c.text} ${c.url}`)}`,
    icon: <><path d="M12 3.5c4.7 0 7.5 1.7 7.5 7s-2.8 7-7.5 7c-.8 0-1.6 0-2.3-.2L6.5 20v-3.1C5 15.7 4.5 13.7 4.5 10.5c0-5.3 2.8-7 7.5-7Z" /><path d="M9.5 8.2c.2 2.8 2.6 5.3 5.4 5.6l.8-1.1-1.5-.9-.7.6a3.4 3.4 0 0 1-2.2-2.2l.6-.7-.9-1.5-1.5.2Z" fill="currentColor" stroke="none" /></> },
  { key: 'threads', label: 'Threads', bg: '#000000', href: (c) => `https://www.threads.net/intent/post?text=${enc(`${c.text} ${c.url}`)}`,
    icon: <path d="M16.4 11.2c-.4-2.6-2.1-3.6-4.2-3.6-2 0-3.3 1-3.8 2.4M16.6 11.4c1.9.8 3 2.3 3 4.1 0 2.9-3 5-7.3 5C7.3 20.5 4.5 17 4.5 12S7.3 3.5 12.3 3.5c3.6 0 6 1.7 7 4.7M16.6 11.4c0 2.8-1.6 4.4-3.8 4.4-1.7 0-2.9-.9-2.9-2.3 0-1.6 1.6-2.4 3.6-2.4 1.1 0 2.2.1 3.1.3Z" /> },
  { key: 'x', label: 'X', bg: '#111111', href: (c) => `https://twitter.com/intent/tweet?url=${enc(c.url)}&text=${enc(c.text)}`,
    icon: <path fill="currentColor" stroke="none" d="M17.2 4h2.9l-6.3 7.2L21.2 20h-5.8l-4.5-5.9L5.7 20H2.8l6.7-7.7L2.4 4h5.9l4.1 5.4L17.2 4Zm-1 14.4h1.6L7.5 5.5H5.8l10.4 12.9Z" /> },
  { key: 'linkedin', label: 'LinkedIn', bg: '#0a66c2', href: (c) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(c.url)}`,
    icon: <path fill="currentColor" stroke="none" d="M5.2 9.5h3V19h-3V9.5Zm1.5-4.7a1.7 1.7 0 1 1 0 3.5 1.7 1.7 0 0 1 0-3.5ZM10.2 9.5h2.9v1.3c.4-.8 1.4-1.6 2.9-1.6 3.1 0 3.7 2 3.7 4.7V19h-3v-4.6c0-1.1 0-2.5-1.5-2.5s-1.8 1.2-1.8 2.4V19h-3.2V9.5Z" /> },
  { key: 'gmail', label: 'Gmail', bg: '#ffffff', shape: 'sh-ico-app',
    href: (c) => `https://mail.google.com/mail/?view=cm&fs=1&su=${enc(c.text)}&body=${enc(`${c.text}\n${c.url}`)}`,
    art: <svg className="sh-art-gm" viewBox="52 42 88 66" aria-hidden="true">
      <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
      <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
      <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
      <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92" />
      <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
    </svg> },
];

const Svg = ({ children, size = 22 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

export default function ShareDialog({ open, onClose, title, url, image, price }: {
  open: boolean; onClose: () => void; title: string; url: string; image?: string; price?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [canNative, setCanNative] = useState(false);

  useEffect(() => {
    setMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    setCanNative(typeof navigator.share === 'function');
  }, []);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { setCopied(false); d.showModal(); }
    if (!open && d.open) d.close();
  }, [open]);

  const copyText = async () => {
    try { await navigator.clipboard.writeText(url); return true; } catch { return false; }
  };
  const copy = async () => {
    if (await copyText()) { setCopied(true); toast('Холбоосыг хууллаа'); setTimeout(() => setCopied(false), 2200); }
    else toast('Хуулж чадсангүй. Холбоосыг гараар хуулна уу.');
  };
  const ctx: Ctx = { url, text: title, mobile };

  const onTarget = async (e: React.MouseEvent, t: Target) => {
    const direct = t.href?.(ctx);
    if (direct) { setTimeout(onClose, 150); return; } // <a href> өөрөө нээнэ
    e.preventDefault();
    // Instagram: утсан дээр системийн хуваалцах цонхоор шууд Instagram сонгоно
    if (t.key === 'instagram' && mobile && canNative) { try { await navigator.share({ title, url }); onClose(); } catch { /* cancelled */ } return; }
    const ok = await copyText();
    toast(ok ? `Холбоосыг хууллаа. ${t.hint ?? ''}` : 'Хуулж чадсангүй.');
    if (t.copyOpen) window.open(t.copyOpen(ctx), '_blank', 'noopener');
  };
  const native = async () => { try { await navigator.share({ title, url }); onClose(); } catch { /* cancelled */ } };

  return (
    <dialog ref={ref} className="sh" onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} aria-labelledby="sh-title">
      <div className="sh-box" tabIndex={-1} autoFocus>
        <div className="sh-cover" style={image ? { backgroundImage: `url("${image}")` } : undefined}>
          <button type="button" className="sh-x" onClick={onClose} aria-label="Хаах"><Svg size={18}><path d="M6 6l12 12M18 6 6 18" /></Svg></button>
          <div className="sh-cover-text">
            <span className="sh-kicker">Зар хуваалцах</span>
            <h3 id="sh-title" title={title}>{title}</h3>
            {price && <span className="sh-price">{price}</span>}
          </div>
        </div>

        <div className="sh-body">
          <div className="sh-grid">
            {TARGETS.map((t) => {
              const direct = t.href?.(ctx) || undefined;
              const inner = <>
                <span className={`sh-ico ${t.shape ?? ''}`} style={{ background: t.bg }}>{t.art ?? <Svg>{t.icon}</Svg>}</span>
                <span className="sh-lbl">{t.label}</span>
              </>;
              return direct
                ? <a key={t.key} className="sh-item" href={direct} target="_blank" rel="noopener noreferrer" onClick={(e) => onTarget(e, t)}>{inner}</a>
                : <button key={t.key} type="button" className="sh-item" onClick={(e) => onTarget(e, t)}>{inner}</button>;
            })}
            {canNative && (
              <button type="button" className="sh-item" onClick={native}>
                <span className="sh-ico sh-ico-more"><Svg><circle cx="6" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="18" cy="12" r="1.4" fill="currentColor" /></Svg></span>
                <span className="sh-lbl">Бусад</span>
              </button>
            )}
          </div>

          <div className="sh-sep"><span>эсвэл холбоосыг хуулах</span></div>

          <div className={`sh-copy ${copied ? 'ok' : ''}`}>
            <Svg size={18}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></Svg>
            <input readOnly value={url} aria-label="Зарын холбоос" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" onClick={copy}>
              {copied ? <><Svg size={16}><path d="m5 12 5 5 9-10" /></Svg>Хуулсан</> : 'Хуулах'}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
