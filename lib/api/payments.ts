// Payments for agents' listings (QPay), against listing-server: /api/posts/:id/payment, /api/payments.
// The server decides the amount (listing-server src/pricing.ts); the website only shows it.
import { apiGet, apiPost } from './client';

export interface PaymentItem { code: string; label: string; amount: number }
export interface BankLink { name: string; description: string; logo: string; link: string }
export interface Payment {
  id: number; postId: number | null; amount: number; items: PaymentItem[]; status: 'pending' | 'paid' | 'cancelled';
  /** 'mock' = test mode without QPay (testing/local): pay with the test button instead of a bank app */
  provider: 'qpay' | 'mock'; qrText: string | null; qrImage: string | null; shortUrl: string | null; links: BankLink[];
  paidAt: string | null; createdAt: string;
}

/** Creates (or reuses) the QPay invoice for an agent's listing. `paid: true` when nothing is left to pay. */
export const startPayment = (postId: string) =>
  apiPost<{ paid?: boolean; payment?: Payment }>(`/api/posts/${postId}/payment`);

/** Current status; the server re-checks QPay while it is pending. */
export const getPayment = (id: number) => apiGet<{ payment: Payment }>(`/api/payments/${id}`).then((r) => r.payment);

/** Test mode only (provider 'mock'): marks the invoice paid. */
export const mockPay = (id: number) => apiPost<{ payment: Payment }>(`/api/payments/${id}/mock-pay`).then((r) => r.payment);

export interface PaymentRow {
  id: number; postId: number | null; postTitle: string | null; agentName: string | null; amount: number; items: PaymentItem[];
  status: Payment['status']; provider: Payment['provider']; paidAt: string | null; createdAt: string;
}
export interface PaymentSummary { paidTotal: number; paidCount: number; paidThisMonth: number; mode: 'mock' | 'sandbox' | 'live' | null }

/** Admin: recent payments and income (real QPay payments only; test-mode payments are not counted). */
export const adminPayments = () => apiGet<{ payments: PaymentRow[]; summary: PaymentSummary }>('/api/payments');
