import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Үнэ' };

const ROWS = [
  ['Энгийн зар', '30 хоног', 'Үнэгүй'],
  ['VIP зар', 'Ангилал, хайлтын эхэнд, тодруулсан', '20,000₮ / 7 хоног'],
  ['Онцгой зар', 'Нүүр хуудсанд харагдана', '40,000₮ / 7 хоног'],
  ['Дээшлүүлэх', '"Шинэ зар" жагсаалтын эхэнд гаргана', '3,000₮'],
  ['360° аялал', '3 өрөө хүртэл үнэгүй, түүнээс дээш', '10,000₮ / зар'],
];

export default function PricingPage() {
  return (
    <div className="prose" style={{ margin: '20px 0' }}>
      <h1>Үнэ</h1>
      <table className="admin-table"><tbody>
        <tr><th>Үйлчилгээ</th><th>Тайлбар</th><th>Үнэ</th></tr>
        {ROWS.map((r) => <tr key={r[0]}>{r.map((c) => <td key={c}>{c}</td>)}</tr>)}
      </tbody></table>
      <p className="muted small">Төлбөр: QPay, SocialPay, банкны карт. Энэ прототипт төлбөр жинхэнээр хийгдэхгүй. Үнийг өрсөлдөгчидтэй харьцуулж тогтооно.</p>
    </div>
  );
}
