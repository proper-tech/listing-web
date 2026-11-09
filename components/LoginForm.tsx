'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';
import { useAuth } from './Auth';

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError('');
    try {
      const { user } = await api<{ user: User }>('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email: String(f.get('email') || '').trim(), password: f.get('password') }),
      });
      setUser(user);
      const home = user.role === 'admin' ? '/admin' : '/my';
      router.replace(user.mustChangePassword ? `/account?next=${encodeURIComponent(next || home)}` : next || home);
      router.refresh();
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
    </div>
  );
}
