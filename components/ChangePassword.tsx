'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { changePassword } from '@/lib/mock/api';
import { useAuth } from './Auth';
import { useToast } from './Toast';

export default function ChangePassword({ next, forced }: { next: string; forced: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const { setUser } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const nextPw = String(f.get('next') || '');
    if (nextPw.length < 8) return setError('Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байна.');
    if (nextPw !== f.get('confirm')) return setError('Шинэ нууц үг таарахгүй байна.');
    setBusy(true); setError('');
    try {
      const user = await changePassword(String(f.get('current') || ''), nextPw);
      setUser(user);
      toast('Нууц үг солигдлоо');
      form.reset();
      if (forced) router.replace(next);
    } catch (err) { setError((err as Error).message); }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit}>
      <h3>Нууц үг солих</h3>
      <label className="field"><span>Одоогийн нууц үг</span><input type="password" name="current" autoComplete="current-password" required /></label>
      <label className="field"><span>Шинэ нууц үг (8+ тэмдэгт)</span><input type="password" name="next" autoComplete="new-password" minLength={8} required /></label>
      <label className="field"><span>Шинэ нууц үг дахин</span><input type="password" name="confirm" autoComplete="new-password" minLength={8} required /></label>
      {error && <div className="error-box" style={{ marginBottom: 12 }}>{error}</div>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Хадгалж байна…' : 'Хадгалах'}</button>
      <p className="muted small">Нууц үг солигдоход бусад төхөөрөмж дээрх нэвтрэлт гарна.</p>
    </form>
  );
}
