'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useFavs } from '@/lib/store';

export default function Header() {
  const path = usePathname();
  const q = useSearchParams();
  const favs = useFavs();
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
          <Link href="/my" className={on('my')}>Миний зар</Link>
        </nav>
        <Link href="/post" className="btn btn-primary post-btn">+ Зар нэмэх</Link>
      </div>
    </header>
  );
}
