'use client';
// Leaflet touches `window` on import, so it is loaded inside effects only (never during SSR).
import { useEffect, useRef } from 'react';
import type * as Leaflet from 'leaflet';
import type { Listing } from '@/lib/types';
import { NOIMG, UB } from '@/lib/constants';
import { fmtPrice } from '@/lib/format';
import { GOOGLE_KEY, GoogleLocationPicker, GoogleResultsMap } from './GoogleMaps';

const loadLeaflet = () => import('leaflet').then((m) => (m.default ?? m) as typeof Leaflet);

// CARTO raster tiles need a key (CARTO_API_KEY in .env, exposed by next.config.ts); without one they show "API KEY REQUIRED".
const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY || '';

// Basemaps styled after Google Maps: CARTO Voyager for the road map, Esri imagery + labels for satellite.
const roadLayer = (L: typeof Leaflet) =>
  L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(CARTO_KEY)}`, {
    subdomains: 'abcd', maxNativeZoom: 18, maxZoom: 20, className: 'map-tiles',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
  });
const satLayer = (L: typeof Leaflet) => L.layerGroup([
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 20, maxNativeZoom: 19, className: 'map-tiles', attribution: 'Tiles &copy; Esri',
  }),
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 20, maxNativeZoom: 19,
  }),
]);
const FS_SVG = '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M0 0v6h2V2h4V0H0zm16 0h-4v2h4v4h2V0h-2zm0 16h-4v2h6v-6h-2v4zM2 12H0v6h6v-2H2v-4z"/></svg>';
const PIN_SVG = '<svg viewBox="0 0 24 32" aria-hidden="true"><path d="M12 31s10-10.2 10-18.5A10 10 0 0 0 2 12.5C2 20.8 12 31 12 31z"/><circle cx="12" cy="12.5" r="3.8"/></svg>';
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const pinIcon = (L: typeof Leaflet, html: string) => L.divIcon({ className: '', html, iconSize: undefined });

/** Google-Maps-style chrome: Map/Satellite switch (top left), fullscreen (top right), zoom (bottom right). */
function addControls(L: typeof Leaflet, map: Leaflet.Map) {
  const road = roadLayer(L).addTo(map);
  const sat = satLayer(L);
  const Seg = L.Control.extend({
    onAdd() {
      const el = L.DomUtil.create('div', 'gm-seg');
      el.innerHTML = '<button type="button" class="on" data-k="map">Газрын зураг</button><button type="button" data-k="sat">Хиймэл дагуул</button>';
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
      el.addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest('button');
        if (!b || b.classList.contains('on')) return;
        const toSat = b.dataset.k === 'sat';
        (toSat ? road : sat).remove();
        (toSat ? sat : road).addTo(map);
        el.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      });
      return el;
    },
  });
  const Fs = L.Control.extend({
    onAdd() {
      const b = L.DomUtil.create('button', 'gm-btn') as HTMLButtonElement;
      b.type = 'button'; b.title = 'Бүтэн дэлгэц'; b.setAttribute('aria-label', 'Бүтэн дэлгэц'); b.innerHTML = FS_SVG;
      L.DomEvent.disableClickPropagation(b);
      b.addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else map.getContainer().requestFullscreen?.();
      });
      return b;
    },
  });
  new Seg({ position: 'topleft' }).addTo(map);
  new Fs({ position: 'topright' }).addTo(map);
  L.control.zoom({ position: 'bottomright', zoomInTitle: 'Томруулах', zoomOutTitle: 'Жижигрүүлэх' }).addTo(map);
  const onFs = () => setTimeout(() => map.invalidateSize(), 60);
  document.addEventListener('fullscreenchange', onFs);
  map.on('unload', () => document.removeEventListener('fullscreenchange', onFs));
}

/** Hook: create a Leaflet map in `ref` once, run `init`, remove on unmount. */
function useLeafletMap(ref: React.RefObject<HTMLDivElement | null>, init: (L: typeof Leaflet, map: Leaflet.Map) => void, opts?: Leaflet.MapOptions) {
  const mapRef = useRef<Leaflet.Map | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !ref.current) return;
      const map = L.map(ref.current, { zoomControl: false, ...opts });
      map.attributionControl.setPrefix(false);
      addControls(L, map);
      mapRef.current = map; LRef.current = L;
      init(L, map);
    });
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { mapRef, LRef };
}

/** Search results map: real Google Maps when GOOGLE_MAPS_API_KEY is set, otherwise CARTO tiles via Leaflet. */
export function ResultsMap({ items }: { items: Listing[] }) {
  return GOOGLE_KEY ? <GoogleResultsMap items={items} /> : <LeafletResultsMap items={items} />;
}

function LeafletResultsMap({ items }: { items: Listing[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const draw = (L: typeof Leaflet, map: Leaflet.Map, list: Listing[]) => {
    layer.current?.remove();
    const g = L.layerGroup().addTo(map);
    layer.current = g;
    const pts: [number, number][] = [];
    for (const l of list) {
      const cls = l.promo === 2 ? 'top' : l.promo === 1 ? 'vip' : '';
      const meta = [l.location.district, l.rooms ? `${l.rooms} өрөө` : '', l.area ? `${l.area} м²` : ''].filter(Boolean).map((x) => esc(String(x))).join(' · ');
      L.marker([l.location.lat, l.location.lng], { riseOnHover: true, icon: pinIcon(L, `<span class="map-pin ${cls}">${esc(fmtPrice(l.price).replace('₮', '').trim())}</span>`) })
        .bindPopup(
          `<a class="mp-card" href="/listing/${esc(l.id)}">` +
            `<span class="mp-img"><img src="${esc(l.photos[0]?.src || NOIMG)}" alt="" loading="lazy"></span>` +
            `<span class="mp-body"><b class="mp-price">${esc(fmtPrice(l.price))}${l.dealType === 'rent' ? '<small> /сар</small>' : ''}</b>` +
            `<span class="mp-title">${esc(l.title)}</span>${meta ? `<span class="mp-meta">${meta}</span>` : ''}` +
            `<span class="mp-more">Дэлгэрэнгүй →</span></span></a>`,
          { className: 'mp-popup', minWidth: 240, maxWidth: 240, offset: [0, -34], closeButton: true },
        )
        .addTo(g);
      pts.push([l.location.lat, l.location.lng]);
    }
    if (pts.length) map.fitBounds(pts, { padding: [60, 60], maxZoom: 15 });
  };
  const { mapRef, LRef } = useLeafletMap(ref, (L, map) => { map.setView(UB, 12); draw(L, map, items); });
  useEffect(() => {
    if (mapRef.current && LRef.current) draw(LRef.current, mapRef.current, items);
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="map" ref={ref} />;
}

/** Listing page: Google's own embed (no key needed) with its red pin, places, Map/Satellite and Street View. */
export function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const src = `https://maps.google.com/maps?q=${lat},${lng}&z=16&hl=mn&output=embed`;
  return (
    <div className="mini-map gmap">
      <iframe src={src} title="Байршил" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
    </div>
  );
}

type PickerProps = {
  value: { lat: number | null; lng: number | null };
  center: [number, number] | null;
  onPick: (lat: number, lng: number) => void;
};
/** Location picker: real Google Maps when GOOGLE_MAPS_API_KEY is set, otherwise CARTO tiles via Leaflet. */
export function LocationPicker(props: PickerProps) {
  return GOOGLE_KEY ? <GoogleLocationPicker {...props} /> : <LeafletLocationPicker {...props} />;
}

function LeafletLocationPicker({ value, center, onPick }: PickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const marker = useRef<Leaflet.Marker | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;
  const icon = (L: typeof Leaflet) => pinIcon(L, `<span class="map-drop">${PIN_SVG}</span>`);
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
