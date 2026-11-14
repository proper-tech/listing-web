import type { Metadata } from 'next';
import RequireUser from '@/components/RequireUser';
import PaymentView from '@/components/PaymentView';

export const metadata: Metadata = { title: 'Төлбөр төлөх' };

type Props = { params: Promise<{ id: string }> };

/** QPay payment for an agent's listing (`id` = the listing). Opened right after "Нийтлэх" and from "Миний зар". */
export default async function PayPage({ params }: Props) {
  const { id } = await params;
  return <RequireUser roles={['agent', 'admin']} path={`/pay/${id}`}><PaymentView key={id} postId={id} /></RequireUser>;
}
