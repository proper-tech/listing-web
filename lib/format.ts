import type { Listing } from './types';

const trimNum = (x: number) => String(Number(x.toFixed(2)));

export function fmtPrice(n?: number | null): string {
  if (n == null) return '';
  if (n >= 1e9) return trimNum(n / 1e9) + ' тэрбум₮';
  if (n >= 1e6) return trimNum(n / 1e6) + ' сая₮';
  return Math.round(n).toLocaleString('en-US').replace(/,/g, ' ') + '₮';
}

export const fmtFull = (n: number) => Math.round(n).toLocaleString('en-US').replace(/,/g, ' ') + '₮';

export function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))} мин өмнө`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (d >= today) return `Өнөөдөр ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.getTime() >= today.getTime() - 864e5) return 'Өчигдөр';
  return `${Math.ceil((today.getTime() - d.getTime()) / 864e5)} өдрийн өмнө`;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/** Давхарыг харуулах: сөрөг утга нь подвал (B1, B2 ...). */
export const fmtFloor = (n: number) => (n < 0 ? `B${-n}` : String(n));

export function specLine(l: Pick<Listing, 'rooms' | 'area' | 'floor' | 'buildingFloors'>): string {
  const p: string[] = [];
  if (l.rooms) p.push(`${l.rooms} өрөө`);
  if (l.area) p.push(`${l.area} м²`);
  if (l.floor && l.buildingFloors) p.push(`${fmtFloor(l.floor)}/${l.buildingFloors} давхар`);
  else if (l.floor) p.push(`${fmtFloor(l.floor)} давхар`);
  return p.join(' · ');
}
