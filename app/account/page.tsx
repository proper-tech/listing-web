import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser, homeFor, safeNext } from '@/lib/session';
import ChangePassword from '@/components/ChangePassword';

export const metadata: Metadata = { title: 'Миний бүртгэл' };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/account');
  return (
    <div className="panel auth-card">
      <h1>Миний бүртгэл</h1>
      <p className="muted small" style={{ marginTop: 0 }}>
        {user.name} · {user.role === 'admin' ? 'Админ' : 'Агент'} · имэйл: <b>{user.email}</b>
      </p>
      {user.mustChangePassword && (
        <div className="warn-box">Таны нууц үгийг админ тохируулсан эсвэл анхны нууц үг байна. Үргэлжлүүлэхийн өмнө шинэ нууц үг тохируулна уу.</div>
      )}
      <ChangePassword next={safeNext(next, homeFor(user))} forced={user.mustChangePassword} />
    </div>
  );
}
