import type { Metadata } from 'next';
import Link from 'next/link';
import { PLACEMENTS, POSTING_FEE } from '@/lib/constants';
import { fmtFull } from '@/lib/format';

export const metadata: Metadata = { title: 'Үнэ' };

// Same numbers the server charges (listing-server src/pricing.ts, mirrored in lib/constants.ts).
const ROWS: [string, string, string][] = [
  ['Зар байршуулах', '30 хоног нийтлэгдэнэ. Агент бүр зар тус бүрдээ төлнө.', fmtFull(POSTING_FEE)],
  [PLACEMENTS.vip.name, 'Ангилал, хайлтын эхэнд 7 хоног (зар байршуулах дээр нэмэгдэнэ)', `+${fmtFull(PLACEMENTS.vip.price)}`],
  [PLACEMENTS.top.name, 'Нүүр хуудсанд 7 хоног (зар байршуулах дээр нэмэгдэнэ)', `+${fmtFull(PLACEMENTS.top.price)}`],
];

export default function PricingPage() {
  return (
    <div className="prose my-5">
      <h1>Үнэ</h1>
      <div className="scroll-x"><table className="admin-table"><tbody>
        <tr><th>Үйлчилгээ</th><th>Тайлбар</th><th>Үнэ</th></tr>
        {ROWS.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{i === 2 ? <b>{c}</b> : c}</td>)}</tr>)}
      </tbody></table></div>
      <ul className="muted">
        <li>Төлбөрийг <b>QPay</b>-ээр — банкны аппаараа QR уншуулж эсвэл утаснаас шууд төлнө.</li>
        <li>Төлбөр орсны дараа зар админы хяналтад очно. VIP/Онцгой-ийн 7 хоног зар нийтлэгдэх үеэс эхэлнэ.</li>
        <li>Татгалзсан зарыг дахин хянуулахад дахин төлөхгүй.</li>
        <li>Зар үзэх, хайх, зар оруулагчтай холбогдох нь үнэгүй.</li>
      </ul>
      <p><Link className="btn btn-primary" href="/post">+ Зар нэмэх</Link></p>
    </div>
  );
}
