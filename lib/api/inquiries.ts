// Inquiries ("Энэ зарын талаар холбогдох") against listing-server:
//   POST /api/posts/:id/inquiries (public), GET /api/inquiries, PATCH|DELETE /api/inquiries/:id (post owner or admin).
// Same function names as the old lib/mock/api.ts; the server's `readAt` becomes the app's `read` flag.
import type { InquiryWithListing } from '../types';
import { apiDelete, apiGet, apiPatch, apiPost } from './client';

interface ApiInquiry {
  id: number; postId: number; postTitle: string; name: string; phone: string; email: string | null;
  message: string; readAt: string | null; createdAt: string;
}
interface InquiryList { inquiries: ApiInquiry[]; total: number; unread: number; page: number; limit: number; pages: number }

/** 8-digit Mongolian number: strips +976, spaces, dashes. '' when invalid. Same rule as the server. */
export function normPhone(v: unknown): string {
  let d = typeof v === 'string' ? v.replace(/\D/g, '') : '';
  if (d.length === 11 && d.startsWith('976')) d = d.slice(3);
  return /^[5-9]\d{7}$/.test(d) ? d : '';
}

const toInquiry = (q: ApiInquiry): InquiryWithListing => ({
  id: String(q.id), listingId: String(q.postId), listingTitle: q.postTitle, name: q.name, phone: q.phone,
  email: q.email ?? undefined, message: q.message, createdAt: q.createdAt, read: q.readAt != null,
});

export async function sendInquiry(listingId: string, b: { name: string; phone: string; email?: string; message: string }): Promise<void> {
  await apiPost(`/api/posts/${listingId}/inquiries`, {
    name: b.name.trim(), phone: b.phone, email: b.email?.trim() || undefined, message: b.message.trim(),
  });
}

/** Inquiries to the signed-in agent's listings (admin: all), newest first. */
export async function myInquiries(): Promise<InquiryWithListing[]> {
  const { inquiries } = await apiGet<InquiryList>('/api/inquiries', { params: { limit: 100 } });
  return inquiries.map(toInquiry);
}

export async function markInquiryRead(id: string, read = true): Promise<void> {
  await apiPatch(`/api/inquiries/${id}`, { read });
}

export async function deleteInquiry(id: string): Promise<void> {
  await apiDelete(`/api/inquiries/${id}`);
}
