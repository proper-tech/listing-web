'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useFavs } from '@/lib/store';
import { useAuth } from './Auth';

export default function Header() {
  const path = usePathname();
  const q = useSearchParams();
  const favs = useFavs();
  const auth = useAuth();
  // The header hydrates inside <Suspense>, possibly after the login check has finished.
  // Render login-dependent parts only after this component mounted, so the first client
  // render matches the server HTML (no hydration mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const user = mounted ? auth.user : null;
  const loading = !mounted || auth.loading;
  const { logout } = auth;
  const on = (key: string) => {
    if (key === 'sale' || key === 'rent') return path === '/search' && (q.get('deal') || 'sale') === key ? 'on' : '';
    return path === '/' + key ? 'on' : '';
  };
  return (
    <header className="topbar">
      <div className="wrap topbar-inner">
        <Link href="/" className="logo"><span className="logo-mark">360</span>Гэр360</Link>
        <nav className="nav">
          <Link href="/search?deal=sale" className={on('sale')}>Зарна</Link>
          <Link href="/search?deal=rent" className={on('rent')}>Түрээс</Link>
          <Link href="/saved" className={on('saved')}>Хадгалсан <span className="count">{favs.length || ''}</span></Link>
          {user && <Link href="/my" className={on('my')}>Миний зар</Link>}
          {user?.role === 'admin' && <Link href="/admin" className={on('admin')}>Админ</Link>}
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
          <Link href={`/login?next=${encodeURIComponent(path === '/login' ? '/' : path)}`} className="btn post-btn">Агент нэвтрэх</Link>
        ))}
      </div>
    </header>
  );
}
