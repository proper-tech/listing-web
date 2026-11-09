'use client';
// Leaflet touches `window` on import, so it is loaded inside effects only (never during SSR).
import { useEffect, useRef } from 'react';
import type * as Leaflet from 'leaflet';
import type { Listing } from '@/lib/types';
import { NOIMG, UB } from '@/lib/constants';
import { fmtPrice } from '@/lib/format';

const loadLeaflet = () => import('leaflet').then((m) => (m.default ?? m) as typeof Leaflet);
const tiles = (L: typeof Leaflet) =>
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const pinIcon = (L: typeof Leaflet, html: string) => L.divIcon({ className: '', html, iconSize: undefined });

/** Hook: create a Leaflet map in `ref` once, run `init`, remove on unmount. */
function useLeafletMap(ref: React.RefObject<HTMLDivElement | null>, init: (L: typeof Leaflet, map: Leaflet.Map) => void, opts?: Leaflet.MapOptions) {
  const mapRef = useRef<Leaflet.Map | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !ref.current) return;
      const map = L.map(ref.current, opts);
      tiles(L).addTo(map);
      mapRef.current = map; LRef.current = L;
      init(L, map);
    });
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { mapRef, LRef };
}

export function ResultsMap({ items }: { items: Listing[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const draw = (L: typeof Leaflet, map: Leaflet.Map, list: Listing[]) => {
    layer.current?.remove();
    const g = L.layerGroup().addTo(map);
    layer.current = g;
    const pts: [number, number][] = [];
    for (const l of list) {
      const cls = l.promo === 2 ? 'top' : l.promo === 1 ? 'vip' : '';
      L.marker([l.location.lat, l.location.lng], { icon: pinIcon(L, `<span class="map-pin ${cls}">${esc(fmtPrice(l.price).replace('₮', ''))}</span>`) })
        .bindPopup(`<div style="width:200px"><img src="${esc(l.photos[0]?.src || NOIMG)}" style="border-radius:6px;margin-bottom:6px"><b>${esc(fmtPrice(l.price))}${l.dealType === 'rent' ? ' /сар' : ''}</b><br>${esc(l.title)}<br><a href="/listing/${esc(l.id)}">Дэлгэрэнгүй →</a></div>`)
        .addTo(g);
      pts.push([l.location.lat, l.location.lng]);
    }
    if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 14 });
  };
  const { mapRef, LRef } = useLeafletMap(ref, (L, map) => { map.setView(UB, 12); draw(L, map, items); });
  useEffect(() => {
    if (mapRef.current && LRef.current) draw(LRef.current, mapRef.current, items);
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="map" ref={ref} />;
}

export function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useLeafletMap(ref, (L, map) => {
    map.setView([lat, lng], 14);
    L.circle([lat, lng], { radius: 250, color: '#0f6e5a' }).addTo(map);
  }, { scrollWheelZoom: false });
  return <div className="mini-map" ref={ref} />;
}

export function LocationPicker({ value, center, onPick }: {
  value: { lat: number | null; lng: number | null };
  center: [number, number] | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const marker = useRef<Leaflet.Marker | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;
  const icon = (L: typeof Leaflet) => pinIcon(L, '<span class="map-pin">📍</span>');
  const { mapRef } = useLeafletMap(ref, (L, map) => {
    const has = value.lat != null && value.lng != null;
    map.setView(has ? [value.lat!, value.lng!] : center || UB, has ? 15 : 12);
    if (has) marker.current = L.marker([value.lat!, value.lng!], { icon: icon(L) }).addTo(map);
    map.on('click', (e: Leaflet.LeafletMouseEvent) => {
      if (marker.current) marker.current.setLatLng(e.latlng);
      else marker.current = L.marker(e.latlng, { icon: icon(L) }).addTo(map);
      pick.current(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6));
    });
  });
  useEffect(() => { if (center && mapRef.current) mapRef.current.setView(center, 14); }, [center?.[0], center?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="mini-map" ref={ref} style={{ height: 360 }} />;
}
