'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { adminCreateUser, adminListings, adminUpdateListing, adminUpdateUser, adminUsers, resetMockData } from '@/lib/mock/api';
import type { AdminListing, AdminUser, Report } from '@/lib/types';
import { CATS, NOIMG, PLACEMENTS, STATUS_MN } from '@/lib/constants';
import { fmtDate, fmtPrice } from '@/lib/format';
import { Price } from './ListingCard';
import { useToast } from './Toast';
import { useAuth } from './Auth';

type Tab = 'pending' | 'reported' | 'active' | 'all' | 'agents';
const TAB_NAMES: Record<Tab, string> = { pending: 'Хянах', reported: 'Мэдээлэгдсэн', active: 'Идэвхтэй', all: 'Бүх зар', agents: 'Агентууд' };

export default function AdminPanel() {
  const toast = useToast();
  const meId = useAuth().user?.id ?? '';
  const [data, setData] = useState<{ items: AdminListing[]; reports: Report[] } | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tab, setTab] = useState<Tab>('pending');

  const load = useCallback(async () => {
    try {
      const [d, u] = await Promise.all([
        adminListings(),
        adminUsers(),
      ]);
      setData(d); setUsers(u);
    } catch (e) { toast((e as Error).message); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="loading">Ачаалж байна…</div>;

  const groups: Record<Exclude<Tab, 'agents'>, AdminListing[]> = {
    pending: data.items.filter((l) => l.status === 'pending'),
    reported: data.items.filter((l) => l.reports > 0),
    active: data.items.filter((l) => l.status === 'active'),
    all: data.items,
  };
  const agents = users.filter((u) => u.role === 'agent');
  const counts: Record<Tab, number> = { ...Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])) as Record<Exclude<Tab, 'agents'>, number>, agents: agents.length };
  const promoTotal = data.items.filter((l) => l.placement !== 'free').reduce((s, l) => s + PLACEMENTS[l.placement].price, 0);

  const act = async (l: AdminListing, body: Parameters<typeof adminUpdateListing>[1], confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    try { await adminUpdateListing(l.id, body); toast('Хадгаллаа'); load(); }
    catch (e) { toast((e as Error).message); }
  };

  return (
    <>
      <div className="section-head" style={{ marginTop: 20 }}>
        <h1>Админ самбар</h1>
        <button className="btn btn-sm" onClick={async () => {
          if (!confirm('Mock өгөгдлийг анхны төлөвт буцаах уу? Нэмсэн зар, агент устна.')) return;
          await resetMockData(); window.location.href = '/';
        }}>Mock өгөгдөл шинэчлэх</button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))' }}>
        <div className="panel"><div className="muted small">Нийт зар</div><div className="price">{data.items.length}</div></div>
        <div className="panel"><div className="muted small">Хянах</div><div className="price">{groups.pending.length}</div></div>
        <div className="panel"><div className="muted small">Агент</div><div className="price">{agents.filter((a) => a.active).length}</div></div>
        <div className="panel"><div className="muted small">VIP/Онцгой орлого (демо)</div><div className="price">{fmtPrice(promoTotal)}</div></div>
      </div>
      <div className="tabs">
        {(Object.keys(TAB_NAMES) as Tab[]).map((k) => (
          <button key={k} className={`btn btn-sm ${k === tab ? 'btn-primary' : ''}`} onClick={() => setTab(k)}>{TAB_NAMES[k]} ({counts[k]})</button>
        ))}
      </div>
      {tab === 'agents' ? <Agents users={users} meId={meId} reload={load} /> : !groups[tab].length ? <div className="empty">Энд зар алга.</div> : (
        <div style={{ overflowX: 'auto' }}><table className="admin-table"><tbody>
          <tr><th /><th>Зар</th><th>Оруулагч</th><th>Төлөв</th><th>Мэдээлэл</th><th /></tr>
          {groups[tab].map((l) => (
            <tr key={l.id}>
              <td><img src={l.photos[0]?.src || NOIMG} alt="" /></td>
              <td>
                <Link href={`/listing/${l.id}`}>{l.title}</Link>
                <div className="muted small"><Price l={l} /> · {CATS[l.category].name} · {l.location.district} {l.hasTour ? '· 360° ✓' : ''}</div>
              </td>
              <td>{l.ownerName || l.sellerName}<div className="muted small">{l.ownerName ? 'бүртгэлтэй' : 'бүртгэлгүй'} · {l.ownerPhone}</div></td>
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

function Agents({ users, meId, reload }: { users: AdminUser[]; meId: string; reload: () => void }) {
  const toast = useToast();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true); setError('');
    try {
      await adminCreateUser({ name: f.get('name'), email: f.get('email'), phone: f.get('phone'), password: f.get('password') });
      toast('Агент нэмэгдлээ. Имэйл хаяг, түр нууц үгээ агентад өгнө үү.');
      form.reset(); reload();
    } catch (err) { setError((err as Error).message); }
    setBusy(false);
  }
  const update = async (u: AdminUser, body: Parameters<typeof adminUpdateUser>[1], msg: string) => {
    try { await adminUpdateUser(u.id, body); toast(msg); reload(); }
    catch (err) { toast((err as Error).message); }
  };
  const resetPassword = (u: AdminUser) => {
    const pw = prompt(`${u.name}: шинэ түр нууц үг (8+ тэмдэгт). Агент дараагийн нэвтрэлтэд өөрөө солино.`);
    if (pw) update(u, { password: pw }, 'Нууц үг шинэчлэгдлээ, агентын нэвтрэлт гарсан');
  };
  const changeEmail = (u: AdminUser) => {
    const email = prompt(`${u.name}: шинэ нэвтрэх имэйл`, u.email);
    if (email && email.trim() !== u.email) update(u, { email }, 'Имэйл солигдлоо');
  };

  return (
    <>
      <div className="panel" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>+ Агент нэмэх</h3>
        <form onSubmit={create}>
          <div className="grid-fields">
            <label className="field"><span>Нэр / компани</span><input type="text" name="name" maxLength={60} required /></label>
            <label className="field"><span>Имэйл (нэвтрэх)</span><input type="email" name="email" placeholder="name@gmail.com" maxLength={254} required /></label>
            <label className="field"><span>Утас (зар дээр харагдана)</span><input type="tel" name="phone" placeholder="8 оронтой" maxLength={11} required /></label>
            <label className="field"><span>Түр нууц үг (8+)</span><input type="text" name="password" minLength={8} autoComplete="off" required /></label>
          </div>
          {error && <div className="error-box" style={{ marginBottom: 12 }}>{error}</div>}
          <button className="btn btn-primary" disabled={busy}>Нэмэх</button>
          <span className="muted small" style={{ marginLeft: 10 }}>Агент анх нэвтрэхдээ нууц үгээ заавал солино.</span>
        </form>
      </div>
      <div style={{ overflowX: 'auto' }}><table className="admin-table"><tbody>
        <tr><th>Нэр</th><th>Имэйл</th><th>Утас</th><th>Эрх</th><th>Зар</th><th>Бүртгэсэн</th><th>Төлөв</th><th /></tr>
        {users.map((u) => (
          <tr key={u.id}>
            <td><b>{u.name}</b>{u.id === meId && <span className="muted small"> (та)</span>}</td>
            <td>{u.email || <span className="error-text">имэйлгүй — нэвтэрч чадахгүй</span>}</td>
            <td>{u.phone || '—'}</td>
            <td>{u.role === 'admin' ? 'Админ' : 'Агент'}</td>
            <td>{u.listings}</td>
            <td>{fmtDate(u.createdAt)}</td>
            <td>
              <span className={`badge ${u.active ? 'active' : 'rejected'}`}>{u.active ? 'Идэвхтэй' : 'Идэвхгүй'}</span>
              {u.mustChangePassword && <div className="muted small">нууц үг солих хүлээгдэж буй</div>}
            </td>
            <td style={{ whiteSpace: 'nowrap' }}>
              {u.id !== meId && (u.active
                ? <button className="btn btn-sm btn-danger" onClick={() => confirm(`${u.name}-г идэвхгүй болгох уу? Нэвтрэлт нь шууд гарна.`) && update(u, { active: false }, 'Идэвхгүй болголоо')}>Идэвхгүй болгох</button>
                : <button className="btn btn-sm" onClick={() => update(u, { active: true }, 'Идэвхжүүллээ')}>Идэвхжүүлэх</button>)}{' '}
              {u.id !== meId && <button className="btn btn-sm" onClick={() => resetPassword(u)}>Нууц үг шинэчлэх</button>}{' '}
              <button className="btn btn-sm" onClick={() => changeEmail(u)}>Имэйл солих</button>
            </td>
          </tr>
        ))}
      </tbody></table></div>
    </>
  );
}
