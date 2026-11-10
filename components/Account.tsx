'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { homeFor } from '@/lib/session';
import { useAuth } from './Auth';
import ChangePassword from './ChangePassword';

export default function Account({ next }: { next: string }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  useEffect(() => { if (!loading && !user) router.replace('/login?next=/account'); }, [loading, user, router]);
  if (!user) return <div className="loading">Ачаалж байна…</div>;
  return (
    <div className="panel auth-card">
      <h1>Миний бүртгэл</h1>
      <p className="muted small" style={{ marginTop: 0 }}>
        {user.name} · {user.role === 'admin' ? 'Админ' : 'Агент'} · имэйл: <b>{user.email}</b>
      </p>
      {user.mustChangePassword && (
        <div className="warn-box">Таны нууц үгийг админ тохируулсан эсвэл анхны нууц үг байна. Үргэлжлүүлэхийн өмнө шинэ нууц үг тохируулна уу.</div>
      )}
      <ChangePassword next={next || homeFor(user)} forced={user.mustChangePassword} />
    </div>
  );
}
