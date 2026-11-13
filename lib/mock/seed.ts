// Mock өгөгдөл: зөвхөн хэрэглэгчид (агент удирдлага, гомдол API-гүй хэвээр). Зарууд listing-server-ээс ирнэ.
import type { Listing, Inquiry, Report, Role } from '../types';

/** Listing as kept in the mock DB (owner fields are never sent to pages as-is). */
export type StoredListing = Omit<Listing, 'hasTour' | 'promo'> & { ownerId?: string; ownerPhone: string };
export interface StoredUser {
  id: string; name: string; email: string; phone: string; role: Role; active: boolean;
  createdAt: string; mustChangePassword: boolean; password: string;
}
export interface MockDB {
  version: number;
  nextNo: number;
  listings: StoredListing[];
  users: StoredUser[];
  reports: Report[];
  inquiries?: Inquiry[]; // нэмэлт: хуучин хадгалсан өгөгдөлд байхгүй байж болно
  sessionUserId: string | null;
}

// 2: жишээ зарууд хасагдсан (зарууд listing-server API-аас ирнэ). Хуучин хөтчийн өгөгдөл шинээр үүснэ.
export const DB_VERSION = 2;
const D = 24 * 3600e3;

export const DEMO_AGENT_ID = 'u-demo-agent';

export function seedDB(): MockDB {
  const t = Date.now();
  const created = new Date(t - 10 * D).toISOString();
  return {
    version: DB_VERSION,
    nextNo: 100001,
    listings: [],
    users: [
      { id: 'u-admin', name: 'Админ', email: 'admin@example.com', phone: '99000000', role: 'admin', active: true, createdAt: created, mustChangePassword: false, password: 'admin1234' },
      { id: DEMO_AGENT_ID, name: 'Гэр Агент ХХК', email: 'agent@example.com', phone: '99000004', role: 'agent', active: true, createdAt: created, mustChangePassword: false, password: 'agent1234' },
    ],
    reports: [],
    inquiries: [],
    sessionUserId: null,
  };
}
