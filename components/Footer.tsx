import Link from 'next/link';
import { CATS, CAT_KEYS, DISTRICTS } from '@/lib/constants';
import { SITE } from '@/lib/site';

const ico = {
  phone: <path d="M5 4h3.5l1.5 4-2 1.3a10 10 0 0 0 6.7 6.7L16 14l4 1.5V19a1 1 0 0 1-1 1A15 15 0 0 1 4 5a1 1 0 0 1 1-1z" />,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.4-4.4" /></>,
  facebook: <path d="M14.5 8H17V4.5h-2.5A4 4 0 0 0 10.5 8.5V11H8v3.5h2.5V21H14v-6.5h2.6L17 11h-3V8.9c0-.5.4-.9.9-.9Z" />,
  instagram: <><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" /><circle cx="16.8" cy="7.2" r=".6" /></>,
  youtube: <><rect x="3" y="6" width="18" height="12" rx="3.5" /><path d="m10.5 9.5 4 2.5-4 2.5z" /></>,
  linkedin: <><rect x="4" y="9.5" width="3.2" height="10" /><circle cx="5.6" cy="5.6" r="1.6" /><path d="M10.5 19.5v-10h3v1.5c.6-1 1.7-1.8 3.2-1.8 2.4 0 3.3 1.6 3.3 4.2v6.1h-3.2v-5.4c0-1.3-.4-2.1-1.6-2.1s-1.7.9-1.7 2.1v5.4z" /></>,
};
const Svg = ({ d }: { d: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const SOCIAL_LABEL: Record<keyof typeof SITE.social, string> = { facebook: 'Facebook', instagram: 'Instagram', youtube: 'YouTube', linkedin: 'LinkedIn' };

export default function Footer() {
  const socials = (Object.keys(SITE.social) as (keyof typeof SITE.social)[]).filter((k) => SITE.social[k]);
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      {/* CTA */}
      <section className="sf-cta">
        <div className="wrap">
          <span className="sf-kicker">Эхэлцгээе</span>
          <h2>Хайж буй байраа <em>360°-аар</em> олоход бэлэн үү?</h2>
          <p>Худалдан авах, түрээслэх эсвэл зараа байршуулах — бүгдийг нэг дороос. Байрыг очиж үзэхээсээ өмнө өрөө бүрээр нь аялаарай.</p>
          <div className="sf-actions">
            <Link href="/search" className="sf-btn sf-btn-primary"><Svg d={ico.search} />Зар хайх</Link>
            <Link href="/post" className="sf-btn sf-btn-ghost">Зар нэмэх<Svg d={ico.arrow} /></Link>
          </div>
          {SITE.phone && <p className="sf-call">Шууд залгах: <a href={`tel:${SITE.phone.replace(/[^\d+]/g, '')}`}>{SITE.phone}</a></p>}
        </div>
      </section>

      {/* Лого, тайлбар, сошиал */}
      <div className="wrap sf-brand">
        <Link href="/" className="logo sf-logo" aria-label={SITE.name}>
          <span className="mark" aria-hidden="true" />
          <span>Proper<i>Tech</i></span>
        </Link>
        <p>{SITE.tagline}</p>
        {socials.length > 0 && (
          <div className="sf-social">
            {socials.map((k) => (
              <a key={k} href={SITE.social[k]} target="_blank" rel="noopener noreferrer" aria-label={SOCIAL_LABEL[k]}><Svg d={ico[k]} /></a>
            ))}
          </div>
        )}
      </div>

      {/* Холбоосын баганууд */}
      <div className="sf-cols-wrap">
        <div className="wrap sf-cols">
          <nav aria-label="Холбоос">
            <h3>Холбоос</h3>
            <Link href="/">Нүүр</Link>
            <Link href="/search?deal=sale">Зарна</Link>
            <Link href="/search?deal=rent">Түрээслүүлнэ</Link>
            <Link href="/search?tour=1">360° аялалтай зар</Link>
            <Link href="/saved">Хадгалсан</Link>
            <Link href="/pricing">Үнэ</Link>
          </nav>
          <nav aria-label="Үл хөдлөхийн төрөл">
            <h3>Төрөл</h3>
            {CAT_KEYS.slice(0, 6).map((k) => <Link key={k} href={`/search?cat=${k}`}>{CATS[k].name}</Link>)}
          </nav>
          <nav aria-label="Дүүрэг">
            <h3>Дүүрэг</h3>
            {DISTRICTS.slice(0, 6).map((d) => <Link key={d} href={`/search?district=${encodeURIComponent(d)}`}>{d}</Link>)}
          </nav>
          <div>
            <h3>Холбоо барих</h3>
            {(SITE.address || SITE.phone || SITE.email) && <ul className="sf-contact">
              {SITE.address && <li><Svg d={ico.pin} /><span>{SITE.address}</span></li>}
              {SITE.phone && <li><Svg d={ico.phone} /><a href={`tel:${SITE.phone.replace(/[^\d+]/g, '')}`}>{SITE.phone}</a></li>}
              {SITE.email && <li><Svg d={ico.mail} /><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>}
            </ul>}
            <Link href="/help">Тусламж ба 360° зураг авах заавар</Link>
            <Link href="/login">Агент, админ нэвтрэх</Link>
          </div>
        </div>
      </div>

      <div className="wrap sf-bottom">
        <span>© {year} {SITE.name}</span>
        <span>Үл хөдлөх хөрөнгийн зар · 360° аялал</span>
      </div>
    </footer>
  );
}
