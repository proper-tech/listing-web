// Server-only helpers: read the session cookie and ask the API who is logged in.
// The API is the real gatekeeper; these only decide which page to show.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Role, User } from './types';

export const SESSION_COOKIE = 'ger360_session';

export async function getSessionUser(): Promise<User | null> {
  const c = (await cookies()).get(SESSION_COOKIE);
  if (!c) return null;
  const base = process.env.API_URL || 'http://localhost:4000';
  try {
    const r = await fetch(base + '/api/auth/me', { headers: { cookie: `${SESSION_COOKIE}=${c.value}` }, cache: 'no-store' });
    if (!r.ok) return null;
    return ((await r.json()) as { user: User | null }).user;
  } catch {
    return null;
  }
}

/** Only allow local paths as "next" targets (no open redirects). */
export function safeNext(next: string | undefined | null, fallback: string): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : fallback;
}

export const homeFor = (u: Pick<User, 'role'>) => (u.role === 'admin' ? '/admin' : '/my');

/** Use at the top of a protected page. Redirects guests to /login and returns the user. */
export async function requirePageUser(roles: Role[], path: string): Promise<User> {
  const u = await getSessionUser();
  if (!u) redirect('/login?next=' + encodeURIComponent(path));
  if (u.mustChangePassword) redirect('/account?next=' + encodeURIComponent(path));
  if (!roles.includes(u.role)) redirect(homeFor(u));
  return u;
}
