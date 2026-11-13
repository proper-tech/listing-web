// Agent/admin sign-in against listing-server (/api/auth/*). The session is an HttpOnly JWT cookie set by
// the server, so nothing here stores a token: the browser sends the cookie on every /api request.
import type { User } from '../types';
import { api, apiGet, apiPatch, apiPost, ApiError } from './client';
import { photoUrl } from './listings';

/** Agent as returned by the server (`PublicAgent`: dates arrive as ISO strings, id is a number). */
interface ApiAgent {
  id: number; name: string; email: string; phone: string; role: User['role'];
  active: boolean; mustChangePassword: boolean; createdAt: string;
  company?: string; bio?: string; avatarKey?: string | null;
}

const toUser = (a: ApiAgent): User => ({
  id: String(a.id), name: a.name, email: a.email, phone: a.phone ?? '', role: a.role,
  active: a.active, mustChangePassword: a.mustChangePassword, createdAt: a.createdAt,
  company: a.company ?? '', bio: a.bio ?? '',
  avatarKey: a.avatarKey ?? null, avatar: a.avatarKey ? photoUrl(`/api/uploads/${a.avatarKey}`) : '',
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

/** Editable profile fields (PATCH /api/auth/me). Send only what changed; `avatarKey: null` removes the photo.
 *  Server limits: name 1–60, phone ≤30 (digits, + - ( ) and spaces), company ≤80, bio ≤400. */
export interface ProfilePatch { name?: string; phone?: string; company?: string; bio?: string; avatarKey?: string | null }

export async function updateProfile(patch: ProfilePatch): Promise<User> {
  const { agent } = await apiPatch<{ agent: ApiAgent }>('/api/auth/me', patch);
  return toUser(agent);
}

/** Uploads a profile photo to R2 (POST /api/uploads); returns the key to pass as `avatarKey`. */
export async function uploadAvatar(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append('file', blob, 'avatar.jpg');
  const { data } = await api.post<{ key: string }>('/api/uploads', form, { timeout: 60_000 });
  return data.key;
}
