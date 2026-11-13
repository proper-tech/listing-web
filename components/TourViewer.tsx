'use client';
import { useEffect, useRef, useState } from 'react';
import type { Tour } from '@/lib/types';
import { getPannellum, type PannellumViewer } from '@/lib/pannellum';
import { panoView } from '@/lib/pano';

/** Multi-room 360° tour: hotspots between rooms, room chips, floor-plan mini map. */
export default function TourViewer({ tour }: { tour: Tour }) {
  const el = useRef<HTMLDivElement>(null);
  const viewer = useRef<PannellumViewer | null>(null);
  const rooms = tour.rooms.filter((r) => r.status === 'ready' && r.panorama);
  const ids = new Set(rooms.map((r) => r.id));
  const start = tour.startRoomId && ids.has(tour.startRoomId) ? tour.startRoomId : rooms[0]?.id;
  const [current, setCurrent] = useState(start);
  const [error, setError] = useState('');
  const key = JSON.stringify(rooms.map((r) => [r.id, r.panorama?.src, r.startYaw, r.hotspots, r.haov, r.vaov]));

  useEffect(() => {
    if (!rooms.length || !el.current) return;
    let cancelled = false;
    getPannellum().then((pannellum) => {
      if (cancelled || !el.current) return;
      const scenes: Record<string, unknown> = {};
      for (const r of rooms) {
        scenes[r.id] = {
          title: r.name + (r.source === 'ai' ? ' · AI-аар үүсгэсэн, зөвхөн санаа' : ''),
          type: 'equirectangular', panorama: r.panorama!.src, yaw: r.startYaw || 0, hfov: 105, ...panoView(r),
          hotSpots: r.hotspots.filter((h) => ids.has(h.targetRoomId)).map((h) => ({
            pitch: h.pitch, yaw: h.yaw, type: 'scene', sceneId: h.targetRoomId,
            text: h.label || rooms.find((x) => x.id === h.targetRoomId)!.name,
          })),
        };
      }
      const v = pannellum.viewer(el.current, {
        default: { firstScene: start, sceneFadeDuration: 700, autoLoad: true, compass: false },
        scenes,
      });
      v.on('scenechange', setCurrent);
      viewer.current = v;
    }).catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
      try { viewer.current?.destroy(); } catch { /* already destroyed */ }
      viewer.current = null;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!rooms.length) return <div className="empty">360° аялал бэлэн биш</div>;
  const go = (id: string) => viewer.current?.loadScene(id);
  const withPlan = rooms.filter((r) => r.floorPlanPosition);
  return (
    <>
      <div className="tour-wrap">
        {/* sized wrapper: Pannellum's own CSS sets height:100% on the element it takes over */}
        <div className="pano"><div ref={el} style={{ width: '100%', height: '100%' }} /></div>
        {error && <div className="error-box">{error}</div>}
        {withPlan.length > 0 && (
          <div className="floorplan" title="Байрны план">
            {withPlan.map((r) => (
              <button key={r.id} className={current === r.id ? 'on' : ''} title={r.name} onClick={() => go(r.id)}
                style={{ left: `${r.floorPlanPosition![0]}%`, top: `${r.floorPlanPosition![1]}%` }} />
            ))}
          </div>
        )}
      </div>
      {rooms.length > 1 && (
        <div className="room-chips">
          {rooms.map((r) => <button key={r.id} className={`chip ${current === r.id ? 'on' : ''}`} onClick={() => go(r.id)}>{r.name}</button>)}
        </div>
      )}
    </>
  );
}
