'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { AdminListing, Report } from '@/lib/types';
import { CATS, NOIMG, PLACEMENTS, STATUS_MN } from '@/lib/constants';
import { fmtPrice } from '@/lib/format';
import { Price } from '@/components/ListingCard';
import { useToast } from '@/components/Toast';

type Tab = 'pending' | 'reported' | 'active' | 'all';
const TAB_NAMES: Record<Tab, string> = { pending: 'Хянах', reported: 'Мэдээлэгдсэн', active: 'Идэвхтэй', all: 'Бүгд' };
const session = {
  get: () => { try { return sessionStorage.getItem('adminKey') || ''; } catch { return ''; } },
  set: (v: string) => { try { if (v) sessionStorage.setItem('adminKey', v); else sessionStorage.removeItem('adminKey'); } catch { /* ignore */ } },
};

export default function AdminPage() {
  const toast = useToast();
  const [key, setKey] = useState('');
  const [data, setData] = useState<{ items: AdminListing[]; reports: Report[] } | null>(null);
  const [tab, setTab] = useState<Tab>('pending');

  const load = useCallback(async (k: string) => {
    try { setData(await api('/api/admin/listings', { headers: { 'x-admin-key': k } })); }
    catch (e) { toast((e as Error).message); setKey(''); session.set(''); setData(null); }
  }, [toast]);
  useEffect(() => { const k = session.get(); if (k) { setKey(k); load(k); } }, [load]);

  if (!key || !data) {
    return (
      <div className="panel" style={{ maxWidth: 380, margin: '40px auto' }}>
        <h1>Админ</h1>
        <form onSubmit={(e) => { e.preventDefault(); const k = String(new FormData(e.currentTarget).get('key') || ''); setKey(k); session.set(k); load(k); }}>
          <label className="field"><span>Админы түлхүүр</span><input type="password" name="key" autoComplete="off" /></label>
          <button className="btn btn-primary">Нэвтрэх</button>
          <p className="muted small">Прототипын үндсэн түлхүүр: <code>admin</code> (ADMIN_KEY орчны хувьсагчаар солино).</p>
        </form>
      </div>
    );
  }

  const groups: Record<Tab, AdminListing[]> = {
    pending: data.items.filter((l) => l.status === 'pending'),
    reported: data.items.filter((l) => l.reports > 0),
    active: data.items.filter((l) => l.status === 'active'),
    all: data.items,
  };
  const promoTotal = data.items.filter((l) => l.placement !== 'free').reduce((s, l) => s + PLACEMENTS[l.placement].price, 0);
  const act = async (l: AdminListing, body: object, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    try { await api(`/api/admin/listings/${l.id}`, { method: 'POST', headers: { 'x-admin-key': key }, body: JSON.stringify(body) }); toast('Хадгаллаа'); load(key); }
    catch (e) { toast((e as Error).message); }
  };

  return (
    <>
      <div className="section-head" style={{ marginTop: 20 }}>
        <h1>Админ самбар</h1>
        <button className="btn btn-sm" onClick={() => { setKey(''); session.set(''); setData(null); }}>Гарах</button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))' }}>
        <div className="panel"><div className="muted small">Нийт зар</div><div className="price">{data.items.length}</div></div>
        <div className="panel"><div className="muted small">Хянах</div><div className="price">{groups.pending.length}</div></div>
        <div className="panel"><div className="muted small">Мэдээлэгдсэн</div><div className="price">{groups.reported.length}</div></div>
        <div className="panel"><div className="muted small">VIP/Онцгой орлого (демо)</div><div className="price">{fmtPrice(promoTotal)}</div></div>
      </div>
      <div className="tabs">
        {(Object.keys(groups) as Tab[]).map((k) => (
          <button key={k} className={`btn btn-sm ${k === tab ? 'btn-primary' : ''}`} onClick={() => setTab(k)}>{TAB_NAMES[k]} ({groups[k].length})</button>
        ))}
      </div>
      {!groups[tab].length ? <div className="empty">Энд зар алга.</div> : (
        <div style={{ overflowX: 'auto' }}><table className="admin-table"><tbody>
          <tr><th /><th>Зар</th><th>Оруулагч</th><th>Төлөв</th><th>Мэдээлэл</th><th /></tr>
          {groups[tab].map((l) => (
            <tr key={l.id}>
              <td><img src={l.photos[0]?.src || NOIMG} alt="" /></td>
              <td>
                {l.status === 'active' ? <Link href={`/listing/${l.id}`}>{l.title}</Link> : <b>{l.title}</b>}
                <div className="muted small"><Price l={l} /> · {CATS[l.category].name} · {l.location.district} {l.hasTour ? '· 360° ✓' : ''}</div>
              </td>
              <td>{l.sellerName}<div className="muted small">{l.ownerPhone}</div></td>
              <td>
                <span className={`badge ${l.status}`}>{STATUS_MN[l.status]}</span>{' '}
                {l.placement !== 'free' && <span className={`badge ${l.placement}`}>{l.placement.toUpperCase()}</span>}
              </td>
              <td>{l.reports > 0 && <>⚑ {l.reports}<div className="muted small">{data.reports.filter((r) => r.listingId === l.id).map((r) => r.reason).join(', ')}</div></>}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {l.status !== 'active' && <button className="btn btn-sm btn-primary" onClick={() => act(l, { status: 'active' })}>Батлах</button>}{' '}
                {l.status === 'pending' && <button className="btn btn-sm" onClick={() => act(l, { status: 'rejected' })}>Татгалзах</button>}{' '}
                {l.status === 'active' && <button className="btn btn-sm" onClick={() => act(l, { status: 'pending' })}>Нуух</button>}{' '}
                <button className="btn btn-sm btn-danger" onClick={() => act(l, { action: 'delete' }, 'Зарыг бүр мөсөн устгах уу? Буцаах боломжгүй.')}>Устгах</button>
              </td>
            </tr>
          ))}
        </tbody></table></div>
      )}
    </>
  );
}
