'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Listing } from '@/lib/types';
import { NOIMG, STATUS_MN } from '@/lib/constants';
import { fmtDate } from '@/lib/format';
import { Price } from './ListingCard';
import { useToast } from './Toast';
import { useAuth } from './Auth';

const MSG = { bump: 'Зар дээшиллээ (демо: төлбөргүй)', renew: '30 хоногоор сунгалаа', sold: 'Зарагдсан гэж тэмдэглэлээ', delete: 'Устгалаа' } as const;

export default function MyAds() {
  const toast = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<Listing[] | null>(null);
  const load = useCallback(async () => {
    try { setItems((await api<{ items: Listing[] }>('/api/mine')).items); } catch (e) { toast((e as Error).message); setItems([]); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const act = async (l: Listing, action: keyof typeof MSG) => {
    if (action === 'delete' && !confirm('Зарыг бүр мөсөн устгах уу? Буцаах боломжгүй.')) return;
    try {
      await api(`/api/listings/${l.id}/owner`, { method: 'POST', body: JSON.stringify({ action }) });
      toast(MSG[action]); load();
    } catch (e) { toast((e as Error).message); }
  };

  return (
    <>
      <div className="section-head" style={{ marginTop: 20 }}><h1>Миний зар</h1><Link className="btn btn-primary" href="/post">+ Зар нэмэх</Link></div>
      {user && <p className="muted small">{user.name} · {user.role === 'admin' ? 'Админ' : 'Агент'}. Таны оруулсан зарууд энд харагдана; агентын зар админ баталсны дараа нийтлэгдэнэ.</p>}
      {!items ? <div className="loading">Ачаалж байна…</div> : !items.length ? <div className="empty">Та одоогоор зар оруулаагүй байна.</div> : (
        <div style={{ overflowX: 'auto' }}><table className="admin-table"><tbody>
          <tr><th /><th>Зар</th><th>Төлөв</th><th>Үзсэн</th><th>Дуусах</th><th /></tr>
          {items.map((l) => (
            <tr key={l.id}>
              <td><img src={l.photos[0]?.src || NOIMG} alt="" /></td>
              <td><Link href={`/listing/${l.id}`}>{l.title}</Link><div className="muted small"><Price l={l} /> · {l.id}</div></td>
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
