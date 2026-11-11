'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Role } from '@/lib/types';
import { homeFor } from '@/lib/session';
import { useAuth } from './Auth';

/** Client-side page guard: the session is an API cookie the browser holds, checked via /api/auth/me in AuthProvider. */
export default function RequireUser({ roles, path, children }: { roles: Role[]; path: string; children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const target = loading ? null
    : !user ? '/login?next=' + encodeURIComponent(path)
    : user.mustChangePassword ? '/account?next=' + encodeURIComponent(path)
    : !roles.includes(user.role) ? homeFor(user)
    : null;
  useEffect(() => { if (target) router.replace(target); }, [target, router]);
  if (loading || target) return <div className="loading">Ачаалж байна…</div>;
  return <>{children}</>;
}
