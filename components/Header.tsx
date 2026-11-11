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
          {dropdown('sale', 'Зарах')}
          {dropdown('rent', 'Түрээслэх')}
          <Link href="/saved" className={onPage('saved')}>
            Хадгалсан <span className="count">{favs.length || ''}</span>
          </Link>
          {user && <Link href="/my" className={onPage('my')}>Миний зар</Link>}
          {user?.role === 'admin' && <Link href="/admin" className={onPage('admin')}>Админ</Link>}
        </nav>
        {!loading && (user ? (
          <div className="user-box">
            <Link href="/post" className="btn btn-primary post-btn">+ Зар нэмэх</Link>
            <Link href="/account" className="user-name" title="Миний бүртгэл">
              {user.name}<small>{user.role === 'admin' ? 'Админ' : 'Агент'}</small>
            </Link>
            <button className="btn btn-sm" onClick={logout}>Гарах</button>
          </div>
        ) : (
          <Link href={`/login?next=${encodeURIComponent(path === '/login' ? '/' : path)}`} className="btn post-btn">Агентаар нэвтрэх</Link>
        ))}
      </div>
    </header>
  );
}
