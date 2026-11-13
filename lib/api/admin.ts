// Reports (anyone can report a listing; admins review them) and agent management (admins only), against
// listing-server: /api/posts/:id/reports, /api/reports, /api/agents. Same names and shapes the old mock API had,
// so the admin panel and listing page only swap their import.
import type { AdminUser, Report, User } from '../types';
import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import { photoUrl } from './listings';

/* ---------- reports ---------- */
export type ReportReason = 'fake' | 'duplicate' | 'wrong_price' | 'sold' | 'other';
interface ApiReport { id: number; postId: number; reason: ReportReason; note: string; createdAt: string }

/** Anyone, no sign-in. Reporting the same listing twice from one connection is accepted but counted once. */
export async function reportListing(id: string, reason: string, note = ''): Promise<void> {
  await apiPost(`/api/posts/${id}/reports`, { reason, note });
}

/** Admin: open (unresolved) reports. */
export async function listReports(): Promise<Report[]> {
  const { reports } = await apiGet<{ reports: ApiReport[] }>('/api/reports');
  return reports.map((r) => ({ id: String(r.id), listingId: String(r.postId), reason: r.reason, note: r.note || undefined, createdAt: r.createdAt }));
}

/** Admin: mark every open report on a listing as handled. */
export async function dismissReports(listingId: string): Promise<void> {
  await apiDelete(`/api/posts/${listingId}/reports`);
}

/* ---------- agents ---------- */
interface ApiAgentRow {
  id: number; name: string; email: string; phone: string; role: User['role']; active: boolean;
  mustChangePassword: boolean; createdAt: string; company?: string; bio?: string; avatarKey?: string | null; listings: number;
}
const toAdminUser = (a: ApiAgentRow): AdminUser => ({
  id: String(a.id), name: a.name, email: a.email, phone: a.phone ?? '', role: a.role, active: a.active,
  mustChangePassword: a.mustChangePassword, createdAt: a.createdAt, company: a.company ?? '', bio: a.bio ?? '',
  avatarKey: a.avatarKey ?? null, avatar: a.avatarKey ? photoUrl(`/api/uploads/${a.avatarKey}`) : '', listings: a.listings,
});

export async function adminUsers(): Promise<AdminUser[]> {
  const { agents } = await apiGet<{ agents: ApiAgentRow[] }>('/api/agents');
  return agents.map(toAdminUser);
}

/** Creates an agent with a temporary password; they must change it on first sign-in. */
export async function adminCreateUser(b: { name: unknown; email: unknown; phone: unknown; password: unknown }): Promise<AdminUser> {
  const { agent } = await apiPost<{ agent: ApiAgentRow }>('/api/agents', {
    name: String(b.name ?? ''), email: String(b.email ?? ''), phone: String(b.phone ?? ''), password: String(b.password ?? ''),
  });
  return toAdminUser(agent);
}

/** `password` sets a new temporary password and signs the agent out everywhere; `active: false` signs them out too. */
export async function adminUpdateUser(
  id: string,
  b: { name?: string; email?: string; phone?: string; active?: boolean; password?: string },
): Promise<AdminUser> {
  const { agent } = await apiPatch<{ agent: ApiAgentRow }>(`/api/agents/${id}`, b);
  return toAdminUser(agent);
}
