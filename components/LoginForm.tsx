'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/mock/api';
import { DEMO_LOGINS } from '@/lib/mock/seed';
import { useAuth } from './Auth';

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { user: current, loading, setUser } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // already logged in → go on
  useEffect(() => {
    if (loading || !current || busy) return;
    router.replace(current.mustChangePassword ? '/account' : next || (current.role === 'admin' ? '/admin' : '/my'));
  }, [loading, current, busy, next, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError('');
    try {
      const user = await login(String(f.get('email') || '').trim(), String(f.get('password') || ''));
      setUser(user);
      const home = user.role === 'admin' ? '/admin' : '/my';
      router.replace(user.mustChangePassword ? `/account?next=${encodeURIComponent(next || home)}` : next || home);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="panel auth-card">
      <h1>Нэвтрэх</h1>
      <p className="muted small">Зөвхөн агент болон админ нэвтэрнэ. Агентын эрхийг админ үүсгэж өгнө.</p>
      <form onSubmit={onSubmit}>
        <label className="field"><span>Имэйл хаяг</span>
          <input type="email" name="email" autoComplete="email" placeholder="name@gmail.com" required autoFocus /></label>
        <label className="field"><span>Нууц үг</span>
          <input type="password" name="password" autoComplete="current-password" required /></label>
        {error && <div className="error-box" style={{ marginBottom: 12 }}>{error}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Нэвтэрч байна…' : 'Нэвтрэх'}</button>
      </form>
      <div className="muted small" style={{ marginTop: 14 }}>
        Туршилтын (mock) эрх:
        {DEMO_LOGINS.map((d) => <div key={d.email}>{d.role}: <b>{d.email}</b> / <b>{d.password}</b></div>)}
      </div>
    </div>
  );
}
