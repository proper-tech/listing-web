'use client';
// Profile page for signed-in agents and admins (/account).
// The server has no profile-update endpoint yet, so name/phone/bio/photo edits are UI-only: they are kept in this
// browser (localStorage, per user id) and shown on this page. Email changes stay with the admin (Админ → Агентууд).
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { homeFor } from '@/lib/session';
import { myListings, adminListings } from '@/lib/api/listings';
import { myInquiries } from '@/lib/api/inquiries';
import { adminUsers } from '@/lib/mock/api';
import { fmtDate } from '@/lib/format';
import type { User } from '@/lib/types';
import { useAuth } from './Auth';
import { useToast } from './Toast';
import ChangePassword from './ChangePassword';
import PageLoader from '@/components/PageLoader';

interface Profile { name: string; phone: string; company: string; bio: string; photo: string }
const KEY = (id: string) => `profile:${id}`;
function loadProfile(u: User): Profile {
  const base: Profile = { name: u.name, phone: u.phone, company: '', bio: '', photo: '' };
  try { return { ...base, ...JSON.parse(localStorage.getItem(KEY(u.id)) || '{}') }; } catch { return base; }
}
function saveProfile(id: string, p: Profile) {
  localStorage.setItem(KEY(id), JSON.stringify(p));
}
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

/** Downscale a picked photo to a 256px square JPEG data URL so it fits comfortably in localStorage. */
function toAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = 256, c = document.createElement('canvas');
      c.width = c.height = s;
      const side = Math.min(img.width, img.height);
      c.getContext('2d')!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, s, s);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', .85));
    };
    img.onerror = () => reject(new Error('Зургийг уншиж чадсангүй'));
    img.src = URL.createObjectURL(file);
  });
}

export default function Account({ next }: { next: string }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  useEffect(() => { if (!loading && !user) router.replace('/login?next=/account'); }, [loading, user, router]);
  if (!user) return <PageLoader />;

  // first sign-in / admin-set password: only the password form until it is changed
  if (user.mustChangePassword) {
    return (
      <div className="panel auth-card">
        <h1>Нууц үг солих</h1>
        <p className="muted small" style={{ marginTop: 0 }}>{user.name} · имэйл: <b>{user.email}</b></p>
        <div className="warn-box">Таны нууц үгийг админ тохируулсан эсвэл анхны нууц үг байна. Үргэлжлүүлэхийн өмнө шинэ нууц үг тохируулна уу.</div>
        <ChangePassword next={next || homeFor(user)} forced />
      </div>
    );
  }
  return <ProfilePage user={user} />;
}

function ProfilePage({ user }: { user: User }) {
  const toast = useToast();
  const isAdmin = user.role === 'admin';
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [stats, setStats] = useState<{ total: number; active: number; views: number; inquiries: number; unread: number } | null>(null);
  const [admin, setAdmin] = useState<{ pending: number; listings: number; agents: number; inactive: number } | null>(null);

  useEffect(() => { const p = loadProfile(user); setProfile(p); setDraft(p); }, [user]);

  useEffect(() => {
    Promise.all([myListings().catch(() => []), myInquiries().catch(() => [])]).then(([ls, inq]) => setStats({
      total: ls.length,
      active: ls.filter((l) => l.status === 'active').length,
      views: ls.reduce((s, l) => s + (l.views || 0), 0),
      inquiries: inq.length,
      unread: inq.filter((i) => !i.read).length,
    }));
    if (isAdmin) {
      Promise.all([adminListings().catch(() => []), adminUsers().catch(() => [])]).then(([ls, us]) => {
        const agents = us.filter((u) => u.role === 'agent');
        setAdmin({ pending: ls.filter((l) => l.status === 'pending').length, listings: ls.length, agents: agents.length, inactive: agents.filter((a) => !a.active).length });
      });
    }
  }, [isAdmin]);

  if (!profile || !draft) return <PageLoader />;
  const dirty = JSON.stringify(profile) !== JSON.stringify(draft);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setDraft((d) => d && { ...d, [k]: v });

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast('Зөвхөн зураг сонгоно уу');
    try { set('photo', await toAvatar(f)); } catch (err) { toast((err as Error).message); }
  };
  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return toast('Нэрээ оруулна уу');
    const clean = { ...draft, name: draft.name.trim(), phone: draft.phone.trim(), company: draft.company.trim(), bio: draft.bio.trim() };
    try { saveProfile(user.id, clean); } catch { return toast('Хадгалж чадсангүй — зургийн хэмжээ хэт том байж магадгүй'); }
    setProfile(clean); setDraft(clean);
    toast('Профайл хадгалагдлаа');
  };

  const roleName = isAdmin ? 'Админ' : 'Агент';
  return (
    <div className="profile">
      <section className="panel profile-head">
        <div className="profile-avatar">{profile.photo ? <img src={profile.photo} alt="" /> : initials(profile.name)}</div>
        <div className="profile-id">
          <div className="profile-name">
            <h1>{profile.name}</h1>
            <span className={`role-chip ${user.role}`}>{roleName}</span>
          </div>
          {profile.company && <div className="profile-company">{profile.company}</div>}
          <div className="profile-contact muted small">
            <span>{user.email}</span>
            {profile.phone && <span>{profile.phone}</span>}
            <span>Бүртгүүлсэн: {fmtDate(user.createdAt)}</span>
          </div>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
        </div>
        <div className="profile-actions">
          <Link className="btn btn-primary btn-sm" href="/post">+ Зар нэмэх</Link>
          <Link className="btn btn-sm" href="/my">Миний зар</Link>
        </div>
      </section>

      <div className="profile-stats">
        <Stat label="Нийт зар" value={stats?.total} />
        <Stat label="Идэвхтэй" value={stats?.active} />
        <Stat label="Нийт үзэлт" value={stats?.views} />
        <Stat label="Хүсэлт" value={stats?.inquiries} note={stats?.unread ? `${stats.unread} уншаагүй` : undefined} href="/my" />
      </div>

      {isAdmin && (
        <section className="panel profile-admin">
          <div className="profile-admin-head">
            <h2>Админ</h2>
            <Link className="btn btn-sm btn-primary" href="/admin">Админ самбар →</Link>
          </div>
          <div className="profile-stats">
            <Stat label="Хянах хүлээгдэж буй" value={admin?.pending} href="/admin" accent={!!admin?.pending} />
            <Stat label="Сайтын нийт зар" value={admin?.listings} href="/admin" />
            <Stat label="Агентууд" value={admin?.agents} note={admin?.inactive ? `${admin.inactive} идэвхгүй` : undefined} href="/admin" />
          </div>
          <p className="muted small" style={{ margin: '12px 0 0' }}>Агент нэмэх, нууц үг шинэчлэх, имэйл солих нь Админ самбар → Агентууд хэсэгт байна.</p>
        </section>
      )}

      <div className="profile-cols">
        <section className="panel">
          <h2>Профайл засах</h2>
          <form onSubmit={onSave}>
            <div className="profile-photo-row">
              <div className="profile-avatar sm">{draft.photo ? <img src={draft.photo} alt="" /> : initials(draft.name)}</div>
              <label className="btn btn-sm">Зураг сонгох<input type="file" accept="image/*" hidden onChange={onPhoto} /></label>
              {draft.photo && <button type="button" className="btn btn-sm" onClick={() => set('photo', '')}>Устгах</button>}
            </div>
            <div className="grid-fields">
              <label className="field"><span>Нэр</span><input type="text" value={draft.name} maxLength={60} onChange={(e) => set('name', e.target.value)} required /></label>
              <label className="field"><span>Утас</span><input type="tel" value={draft.phone} maxLength={11} placeholder="8 оронтой" onChange={(e) => set('phone', e.target.value)} /></label>
            </div>
            <label className="field"><span>Компани / агентлаг</span><input type="text" value={draft.company} maxLength={80} onChange={(e) => set('company', e.target.value)} /></label>
            <label className="field"><span>Танилцуулга</span><textarea rows={4} value={draft.bio} maxLength={400} placeholder="Туршлага, мэргэшсэн бүс нутаг…" onChange={(e) => set('bio', e.target.value)} /></label>
            <label className="field"><span>Имэйл (нэвтрэх)</span><input type="text" value={user.email} disabled /></label>
            <p className="muted small" style={{ marginTop: -6 }}>Имэйлээ солихыг админаас хүснэ үү.</p>
            <div className="profile-save">
              <button className="btn btn-primary" disabled={!dirty}>Хадгалах</button>
              {dirty && <button type="button" className="btn" onClick={() => setDraft(profile)}>Болих</button>}
            </div>
          </form>
        </section>
        <section className="panel">
          <ChangePassword next="/account" forced={false} />
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, note, href, accent }: { label: string; value?: number; note?: string; href?: string; accent?: boolean }) {
  const body = (
    <>
      <div className="muted small">{label}</div>
      <div className="profile-stat-value">{value == null ? '—' : value.toLocaleString('mn-MN')}</div>
      {note && <div className="profile-stat-note">{note}</div>}
    </>
  );
  const cls = `panel profile-stat${accent ? ' accent' : ''}`;
  return href ? <Link className={cls} href={href}>{body}</Link> : <div className={cls}>{body}</div>;
}
