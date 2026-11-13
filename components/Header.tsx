'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useFavs } from '@/lib/store';
import { useAuth } from './Auth';
import { CATS, CAT_KEYS } from '@/lib/constants';
import CatIcon from './CatIcon';

// Топ баар: ProperTech загвар (proper.css-ийн .topbar / .nav / .dd / .menu).
// Зарах / Түрээслэх гэсэн dropdown-д ангиллуудыг CATS-оос авна.
export default function Header() {
  const path = usePathname();
  const q = useSearchParams();
  const favs = useFavs();
  const auth = useAuth();
  // Hydration mismatch-ээс сэргийлж нэвтрэлтээс хамаарах хэсгийг mount-ийн дараа л харуулна.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const user = mounted ? auth.user : null;
  const loading = !mounted || auth.loading;
  const { logout } = auth;
  // phone menu (below 860px the nav is hidden): closes on navigation, Escape, and when the screen gets wide again
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [path, q]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    const wide = window.matchMedia('(min-width: 861px)');
    const onWide = () => { if (wide.matches) setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    wide.addEventListener('change', onWide);
    document.body.classList.add('mnav-open');
    return () => { document.removeEventListener('keydown', onKey); wide.removeEventListener('change', onWide); document.body.classList.remove('mnav-open'); };
  }, [menuOpen]);

  const onDeal = (deal: 'sale' | 'rent') =>
    path === '/search' && (q.get('deal') || 'sale') === deal ? 'on' : '';
  const onPage = (key: string) => (path === '/' + key ? 'on' : '');

  const dropdown = (deal: 'sale' | 'rent', label: string) => (
    <div className="dd" data-nav={deal}>
      <Link href={`/search?deal=${deal}`} className={onDeal(deal)}>{label}</Link>
      <button type="button" className="caret" aria-expanded="false" aria-label={`${label}: төрөл сонгох`}>▾</button>
      <div className="menu" data-deal={deal}>
        {CAT_KEYS.map((k) => (
          <Link key={k} href={`/search?deal=${deal}&cat=${k}`}>
            <span className="ico"><CatIcon cat={k} size={18} /></span><span>{CATS[k].name}</span><span className="n" />
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <header className="topbar">
      <div className="wrap topbar-inner">
        <Link href="/" className="logo" aria-label="ProperTech">
          {/* gold emblem cut from public/logos/logo2.jpeg (transparent PNG); used as a CSS mask and painted in the brand gold, see .logo .mark */}
          <span className="mark" aria-hidden="true" />
          <span>Proper<i>Tech</i></span>
        </Link>
        <nav className="nav" id="nav">
          {dropdown('sale', 'Зарна')}
          {dropdown('rent', 'Түрээс')}
          <Link href="/saved" className={onPage('saved')}>
            Хадгалсан <span className="count">{favs.length || ''}</span>
          </Link>
          {user && <Link href="/my" className={onPage('my')}>Миний зар</Link>}
          {user?.role === 'admin' && <Link href="/admin" className={onPage('admin')}>Админ</Link>}
        </nav>
        <div className="topbar-right">
        {path === '/' && (
          <Link href="/search" className="hs-btn" aria-label="Зар хайх">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <span>Хайх</span>
          </Link>
        )}
        {!loading && (user ? (
          <div className="user-box">
            <Link href="/post" className="btn btn-primary post-btn" aria-label="Зар нэмэх">+<span className="post-label"> Зар нэмэх</span></Link>
            <Link href="/account" className="user-name" title="Миний бүртгэл">
              <Avatar user={user} />
              <span className="user-name-text">{user.name}<small>{user.role === 'admin' ? 'Админ' : 'Агент'}</small></span>
            </Link>
            <button className="btn btn-sm user-logout" onClick={logout}>Гарах</button>
          </div>
        ) : (
          <Link href={`/login?next=${encodeURIComponent(path === '/login' ? '/' : path)}`} className="btn post-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
            <span><span className="login-who">Агентаар </span>нэвтрэх</span>
          </Link>
        ))}
        <button type="button" className="menu-btn" aria-expanded={menuOpen} aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Цэс хаах' : 'Цэс нээх'} onClick={() => setMenuOpen((o) => !o)}>
          <span aria-hidden="true" />
        </button>
        </div>
      </div>
      {menuOpen && (
        <nav id="mobile-menu" className="mnav" aria-label="Цэс"
          onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setMenuOpen(false); }}>
          {user && (
            <Link href="/account" className="mnav-user">
              <Avatar user={user} />
              <span><b>{user.name}</b><small>{user.role === 'admin' ? 'Админ' : 'Агент'} · Миний бүртгэл</small></span>
            </Link>
          )}
          {(['sale', 'rent'] as const).map((deal) => (
            <div key={deal} className="mnav-group">
              <Link href={`/search?deal=${deal}`} className="mnav-head">{deal === 'sale' ? 'Зарна' : 'Түрээс'} <span>Бүгдийг харах →</span></Link>
              <div className="mnav-cats">
                {CAT_KEYS.map((k) => (
                  <Link key={k} href={`/search?deal=${deal}&cat=${k}`}><CatIcon cat={k} size={16} /><span>{CATS[k].name}</span></Link>
                ))}
              </div>
            </div>
          ))}
          <div className="mnav-links">
            <Link href="/search?tour=1">360° аялалтай зар</Link>
            <Link href="/saved">Хадгалсан{favs.length > 0 && <span className="count">{favs.length}</span>}</Link>
            {user && <Link href="/my">Миний зар</Link>}
            {user?.role === 'admin' && <Link href="/admin">Админ самбар</Link>}
            <Link href="/help">Тусламж</Link>
          </div>
          {user
            ? <button type="button" className="btn btn-block" onClick={logout}>Гарах</button>
            : <Link href={`/login?next=${encodeURIComponent(path === '/login' ? '/' : path)}`} className="btn btn-block">Агентаар нэвтрэх</Link>}
        </nav>
      )}
    </header>
  );
}

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

function Avatar({ user }: { user: { name: string; avatar?: string } }) {
  return <span className="hdr-avatar" aria-hidden="true">{user.avatar ? <img src={user.avatar} alt="" /> : initials(user.name)}</span>;
}
