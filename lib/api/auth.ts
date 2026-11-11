// Agent/admin sign-in against listing-server (/api/auth/*). The session is an HttpOnly JWT cookie set by
// the server, so nothing here stores a token: the browser sends the cookie on every /api request.
import type { User } from '../types';
import { apiGet, apiPost, ApiError } from './client';

/** Agent as returned by the server (`PublicAgent`: dates arrive as ISO strings, id is a number). */
interface ApiAgent {
  id: number; name: string; email: string; phone: string; role: User['role'];
  active: boolean; mustChangePassword: boolean; createdAt: string;
}

const toUser = (a: ApiAgent): User => ({
  id: String(a.id), name: a.name, email: a.email, phone: a.phone ?? '', role: a.role,
  active: a.active, mustChangePassword: a.mustChangePassword, createdAt: a.createdAt,
});

export async function login(email: string, password: string): Promise<User> {
  const { agent } = await apiPost<{ agent: ApiAgent }>('/api/auth/login', { email, password });
  return toUser(agent);
}

export async function logout(): Promise<void> {
  await apiPost('/api/auth/logout');
}

/** The signed-in agent, or null when there is no valid session (401). Other failures are thrown. */
export async function getMe(): Promise<User | null> {
  try {
    const { agent } = await apiGet<{ agent: ApiAgent }>('/api/auth/me');
    return toUser(agent);
  } catch (err) {
    if (err instanceof ApiError && err.isUnauthorized) return null;
    throw err;
  }
}

/** Also signs out every other device (the server bumps the token version and issues a fresh cookie here). */
export async function changePassword(currentPassword: string, newPassword: string): Promise<User> {
  const { agent } = await apiPost<{ agent: ApiAgent }>('/api/auth/change-password', { currentPassword, newPassword });
  return toUser(agent);
}
