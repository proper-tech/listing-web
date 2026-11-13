'use client';
/// <reference types="google.maps" />
// Real Google Maps (JavaScript API) for the search map and the location picker. Used by Maps.tsx whenever
// GOOGLE_MAPS_API_KEY is set in .env (exposed to the browser by next.config.ts); otherwise the CARTO/Leaflet maps are used.
// Restrict the key to your domains (HTTP referrers) in Google Cloud Console; it needs "Maps JavaScript API" enabled.
import { useEffect, useRef, useState } from 'react';
import type { MapPin } from '@/lib/api/listings';
import { NOIMG, UB } from '@/lib/constants';
import { fmtPrice } from '@/lib/format';

export const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
// Custom (HTML) markers need a Map ID. DEMO_MAP_ID works out of the box; set GOOGLE_MAP_ID to your own for production.
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || 'DEMO_MAP_ID';

let loading: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof window.google?.maps?.importLibrary === 'function') return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const cb = '__gmapsReady';
    (window as unknown as Record<string, () => void>)[cb] = () => resolve();
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_KEY)}&language=mn&region=MN&loading=async&callback=${cb}`;
    s.async = true;
    s.onerror = () => { loading = null; s.remove(); reject(new Error('Google Maps ачаалж чадсангүй')); };
    document.head.appendChild(s);
  });
  return loading;
}

type Libs = { Map: typeof google.maps.Map; Marker: typeof google.maps.marker.AdvancedMarkerElement; InfoWindow: typeof google.maps.InfoWindow };
async function libs(): Promise<Libs> {
  await loadGoogleMaps();
  const [{ Map, InfoWindow }, { AdvancedMarkerElement }] = await Promise.all([
    google.maps.importLibrary('maps') as Promise<google.maps.MapsLibrary>,
    google.maps.importLibrary('marker') as Promise<google.maps.MarkerLibrary>,
  ]);
  return { Map, Marker: AdvancedMarkerElement, InfoWindow };
}

const toLL = ([lat, lng]: [number, number]) => ({ lat, lng });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Hook: create a Google map in `ref` once and run `init`. */
function useGoogleMap(ref: React.RefObject<HTMLDivElement | null>, init: (g: Libs, map: google.maps.Map) => void, opts: google.maps.MapOptions) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const libsRef = useRef<Libs | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    libs().then((g) => {
      if (cancelled || !ref.current) return;
      const map = new g.Map(ref.current, {
        mapId: MAP_ID, streetViewControl: true, fullscreenControl: true, mapTypeControl: true,
        mapTypeControlOptions: { position: google.maps.ControlPosition.TOP_LEFT },
        ...opts,
      });
      mapRef.current = map; libsRef.current = g;
      init(g, map);
    }).catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { mapRef, libsRef, error };
}

const MapError = ({ msg }: { msg: string }) => <div className="map-error">Газрын зураг ачаалж чадсангүй. {msg}</div>;

export function GoogleResultsMap({ items }: { items: MapPin[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const info = useRef<google.maps.InfoWindow | null>(null);

  const draw = (g: Libs, map: google.maps.Map, list: MapPin[]) => {
    markers.current.forEach((m) => { m.map = null; });
    markers.current = [];
    info.current ??= new g.InfoWindow({ maxWidth: 260 });
    info.current.close();
    const bounds = new google.maps.LatLngBounds();
    for (const l of list) {
      const pin = document.createElement('span');
      pin.className = `map-pin g ${l.promo === 2 ? 'top' : l.promo === 1 ? 'vip' : ''}`;
      pin.textContent = fmtPrice(l.price).replace('₮', '').trim();
      const meta = [l.district, l.rooms ? `${l.rooms} өрөө` : '', l.area ? `${l.area} м²` : ''].filter(Boolean).map((x) => esc(String(x))).join(' · ');
      const card =
        `<a class="mp-card" href="/listing/${esc(l.id)}">` +
          `<span class="mp-img"><img src="${esc(l.cover || NOIMG)}" alt="" loading="lazy"></span>` +
          `<span class="mp-body"><b class="mp-price">${esc(fmtPrice(l.price))}${l.dealType === 'rent' ? '<small> /сар</small>' : ''}</b>` +
          `<span class="mp-title">${esc(l.title)}</span>${meta ? `<span class="mp-meta">${meta}</span>` : ''}` +
          `<span class="mp-more">Дэлгэрэнгүй →</span></span></a>`;
      const position = { lat: l.lat, lng: l.lng };
      const m = new g.Marker({ map, position, content: pin, title: l.title, zIndex: l.promo, gmpClickable: true });
      m.addListener('gmp-click', () => { info.current!.setContent(card); info.current!.open({ map, anchor: m }); });
      markers.current.push(m);
      bounds.extend(position);
    }
    if (list.length === 1) { map.setCenter(bounds.getCenter()); map.setZoom(15); }
    else if (list.length) {
      map.fitBounds(bounds, 60);
      google.maps.event.addListenerOnce(map, 'idle', () => { if ((map.getZoom() ?? 0) > 15) map.setZoom(15); });
    }
  };
  const { mapRef, libsRef, error } = useGoogleMap(ref, (g, map) => draw(g, map, items), { center: toLL(UB), zoom: 12 });
  useEffect(() => {
    if (mapRef.current && libsRef.current) draw(libsRef.current, mapRef.current, items);
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="map">{error ? <MapError msg={error} /> : <div className="map-canvas" ref={ref} />}</div>;
}

export function GoogleLocationPicker({ value, center, onPick }: {
  value: { lat: number | null; lng: number | null };
  center: [number, number] | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const marker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;
  const has = value.lat != null && value.lng != null;
  const { mapRef, error } = useGoogleMap(ref, (g, map) => {
    if (has) marker.current = new g.Marker({ map, position: { lat: value.lat!, lng: value.lng! } });
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      if ('placeId' in e) (e as google.maps.IconMouseEvent).stop(); // clicking a shop/POI picks that spot instead of opening its card
      if (marker.current) marker.current.position = e.latLng;
      else marker.current = new g.Marker({ map, position: e.latLng });
      pick.current(+e.latLng.lat().toFixed(6), +e.latLng.lng().toFixed(6));
    });
  }, {
    center: has ? { lat: value.lat!, lng: value.lng! } : toLL(center || UB),
    zoom: has ? 16 : 12, draggableCursor: 'crosshair', gestureHandling: 'greedy',
  });
  useEffect(() => {
    if (center && mapRef.current) { mapRef.current.setCenter(toLL(center)); mapRef.current.setZoom(15); }
  }, [center?.[0], center?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="mini-map" style={{ height: 360 }}>{error ? <MapError msg={error} /> : <div className="map-canvas" ref={ref} />}</div>;
}
