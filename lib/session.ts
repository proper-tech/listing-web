import type { User } from './types';

/** Only allow local paths as "next" targets (no open redirects). */
export function safeNext(next: string | undefined | null, fallback: string): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : fallback;
}

export const homeFor = (u: Pick<User, 'role'>) => (u.role === 'admin' ? '/admin' : '/my');
