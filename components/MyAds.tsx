'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { myListings, ownerAction, type OwnerAction } from '@/lib/api/listings';
import type { Listing } from '@/lib/types';
import { NOIMG, STATUS_MN } from '@/lib/constants';
import { fmtDate } from '@/lib/format';
import { Price } from './ListingCard';
import { useToast } from './Toast';
import { useAuth } from './Auth';
import InquiryInbox from './InquiryInbox';
import PageLoader from '@/components/PageLoader';

const MSG: Record<OwnerAction, string> = { sold: 'Зарагдсан гэж тэмдэглэлээ', archive: 'Архивлалаа — нийтэд харагдахгүй', restore: 'Сэргээлээ', delete: 'Устгалаа' };

export default function MyAds() {
  const toast = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<Listing[] | null>(null);
  const load = useCallback(async () => {
    try { setItems(await myListings()); } catch (e) { toast((e as Error).message); setItems([]); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const isAdmin = user?.role === 'admin';
  const act = async (l: Listing, action: OwnerAction) => {
    if (action === 'delete' && !confirm('Зарыг бүр мөсөн устгах уу? Буцаах боломжгүй.')) return;
    try {
      await ownerAction(l.id, action, isAdmin);
      toast(action === 'restore' && !isAdmin ? 'Сэргээлээ — админ дахин шалгаад нийтэлнэ' : MSG[action]); load();
    } catch (e) { toast((e as Error).message); }
  };

  return (
    <>
      <div className="section-head mt-5"><h1>Миний зар</h1><Link className="btn btn-primary" href="/post">+ Зар нэмэх</Link></div>
      {user && <p className="muted small">{user.name} · {user.role === 'admin' ? 'Админ' : 'Агент'}. Таны оруулсан зарууд энд харагдана; агентын зар админ баталсны дараа нийтлэгдэнэ.</p>}
      {!items ? <PageLoader /> : !items.length ? <div className="empty">Та одоогоор зар оруулаагүй байна.</div> : (
        <div className="scroll-x"><table className="admin-table"><tbody>
          <tr><th /><th>Зар</th><th>Төлөв</th><th>Үзсэн</th><th>Оруулсан</th><th /></tr>
          {items.map((l) => (
            <tr key={l.id}>
              <td><img src={l.photos[0]?.src || NOIMG} alt="" /></td>
              <td><Link href={`/listing/${l.id}`}>{l.title}</Link><div className="muted small"><Price l={l} /> · {l.id}</div></td>
              <td><span className={`badge ${l.status}`}>{STATUS_MN[l.status]}</span></td>
              <td>{l.views}</td>
              <td>{fmtDate(l.createdAt)}</td>
              <td className="nowrap">
                {(l.status === 'archived' || l.status === 'sold')
                  ? <button className="btn btn-sm" onClick={() => act(l, 'restore')}>Сэргээх</button>
                  : <>
                      {l.status === 'active' && <button className="btn btn-sm" onClick={() => act(l, 'sold')}>Зарагдсан</button>}{' '}
                      <button className="btn btn-sm" onClick={() => act(l, 'archive')}>Архивлах</button>
                    </>}{' '}
                <button className="btn btn-sm btn-danger" onClick={() => act(l, 'delete')}>Устгах</button>
              </td>
            </tr>
          ))}
        </tbody></table></div>
      )}
      <InquiryInbox />
    </>
  );
}
