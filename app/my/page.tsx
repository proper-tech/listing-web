'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { store } from '@/lib/store';
import type { MyListing } from '@/lib/types';
import { NOIMG, STATUS_MN } from '@/lib/constants';
import { fmtDate } from '@/lib/format';
import { Price } from '@/components/ListingCard';
import { useToast } from '@/components/Toast';

const MSG = { bump: 'Зар дээшиллээ (демо: төлбөргүй)', renew: '30 хоногоор сунгалаа', sold: 'Зарагдсан гэж тэмдэглэлээ', delete: 'Устгалаа' } as const;

export default function MyPage() {
  const toast = useToast();
  const [items, setItems] = useState<MyListing[] | null>(null);
  const load = useCallback(async () => {
    const tokens = store.get<string[]>('tokens', []);
    const r = tokens.length ? await api<{ items: MyListing[] }>('/api/mine', { method: 'POST', body: JSON.stringify({ tokens }) }) : { items: [] };
    setItems(r.items);
  }, []);
  useEffect(() => { load().catch((e) => { toast(e.message); setItems([]); }); }, [load, toast]);

  const act = async (l: MyListing, action: keyof typeof MSG) => {
    if (action === 'delete' && !confirm('Зарыг бүр мөсөн устгах уу? Буцаах боломжгүй.')) return;
    try {
      await api(`/api/listings/${l.id}/owner`, { method: 'POST', body: JSON.stringify({ token: l.token, action }) });
      toast(MSG[action]); load();
    } catch (e) { toast((e as Error).message); }
  };

  return (
    <>
      <div className="section-head" style={{ marginTop: 20 }}><h1>Миний зар</h1><Link className="btn btn-primary" href="/post">+ Зар нэмэх</Link></div>
      <p className="muted small">Энэ хөтөч дээрээс оруулсан зарууд харагдана. (Жинхэнэ сайтад утасны дугаар + SMS кодоор нэвтэрнэ.)</p>
      {!items ? <div className="loading">Ачаалж байна…</div> : !items.length ? <div className="empty">Та одоогоор зар оруулаагүй байна.</div> : (
        <div style={{ overflowX: 'auto' }}><table className="admin-table"><tbody>
          <tr><th /><th>Зар</th><th>Төлөв</th><th>Үзсэн</th><th>Дуусах</th><th /></tr>
          {items.map((l) => (
            <tr key={l.id}>
              <td><img src={l.photos[0]?.src || NOIMG} alt="" /></td>
              <td>{l.status === 'active' ? <Link href={`/listing/${l.id}`}>{l.title}</Link> : l.title}<div className="muted small"><Price l={l} /> · {l.id}</div></td>
              <td><span className={`badge ${l.status}`}>{STATUS_MN[l.status]}</span></td>
              <td>{l.views}</td>
              <td>{fmtDate(l.expiresAt)}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="btn btn-sm" onClick={() => act(l, 'bump')}>↑ Дээшлүүлэх</button>{' '}
                <button className="btn btn-sm" onClick={() => act(l, 'renew')}>Сунгах</button>{' '}
                <button className="btn btn-sm" onClick={() => act(l, 'sold')}>Зарагдсан</button>{' '}
                <button className="btn btn-sm btn-danger" onClick={() => act(l, 'delete')}>Устгах</button>
              </td>
            </tr>
          ))}
        </tbody></table></div>
      )}
    </>
  );
}
