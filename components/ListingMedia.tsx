'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Img, Tour } from '@/lib/types';
import { NOIMG } from '@/lib/constants';
import TourViewer from './TourViewer';
import Icon from './Icon';

const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
  </svg>
);

/** Photo gallery + 360° tour of a listing. Photos: arrow keys and swipe change the photo, a click opens it full screen. */
export default function ListingMedia({ photos, tour, startWithTour, title = '' }: { photos: Img[]; tour?: Tour; startWithTour: boolean; title?: string }) {
  const readyRooms = tour ? tour.rooms.filter((r) => r.status === 'ready').length : 0;
  const [mode, setMode] = useState<'photos' | 'tour'>((startWithTour && readyRooms) || !photos.length ? 'tour' : 'photos');
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const n = photos.length;
  const go = useCallback((i: number) => setIdx((i + n) % n), [n]);
  const alt = (i: number) => `${title || 'Зар'} — зураг ${i + 1}/${n}`;

  // full-screen view: a native <dialog> brings the focus trap, Esc and the backdrop
  const dlg = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (zoom && !d.open) d.showModal();
    if (!zoom && d.open) d.close();
  }, [zoom]);

  const onKey = (e: React.KeyboardEvent) => {
    if (n < 2) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
  };
  // swipe left / right on touch screens (mostly-horizontal moves only, so the page still scrolls)
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s || n < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x, dy = t.clientY - s.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(idx + (dx < 0 ? 1 : -1));
  };
  const swipe = { onTouchStart, onTouchEnd };

  // keep the current thumbnail in view (scrolls the strip only, never the page)
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = strip.current;
    const el = box?.querySelector<HTMLElement>('.on');
    if (box && el) box.scrollTo({ left: el.offsetLeft - (box.clientWidth - el.clientWidth) / 2, behavior: 'smooth' });
  }, [idx]);

  const nav = n > 1 && <>
    <button type="button" className="gallery-nav prev" aria-label="Өмнөх зураг" onClick={() => go(idx - 1)}><Chevron dir="left" /></button>
    <button type="button" className="gallery-nav next" aria-label="Дараах зураг" onClick={() => go(idx + 1)}><Chevron dir="right" /></button>
  </>;

  return (
    <>
      {/* the switch is only needed when there is something to switch between */}
      {n > 0 && readyRooms > 0 && (
        <div className="media-tabs">
          <button className={`btn btn-sm ${mode === 'photos' ? 'btn-primary' : ''}`} aria-pressed={mode === 'photos'} onClick={() => setMode('photos')}><Icon name="camera" /> Зураг ({n})</button>
          <button className={`btn btn-sm ${mode === 'tour' ? 'btn-primary' : ''}`} aria-pressed={mode === 'tour'} onClick={() => setMode('tour')}><Icon name="tour" /> 360° аялал ({readyRooms} өрөө)</button>
        </div>
      )}
      {mode === 'tour' && tour && readyRooms > 0 ? <TourViewer tour={tour} /> : n ? (
        <>
          <div className="gallery-main" onKeyDown={onKey} {...swipe}>
            {/* the same photo, blurred, fills the frame behind portrait or narrow photos instead of black bars */}
            <img className="gallery-bg" src={photos[idx].src} alt="" aria-hidden="true" />
            <button type="button" className="gallery-zoom" aria-label="Зургийг томоор үзэх" onClick={() => setZoom(true)}>
              <img src={photos[idx].src} alt={alt(idx)} />
            </button>
            {nav}
            {n > 1 && <span className="gallery-count" aria-hidden="true">{idx + 1} / {n}</span>}
          </div>
          {n > 1 && (
            <div className="thumbs" ref={strip}>
              {photos.map((p, i) => (
                <button key={p.src + i} type="button" className={`thumb ${i === idx ? 'on' : ''}`} aria-label={`Зураг ${i + 1}`} aria-current={i === idx ? 'true' : undefined} onClick={() => setIdx(i)}>
                  <img src={p.src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
          <dialog ref={dlg} className="lb" aria-label="Зураг томоор" onClose={() => setZoom(false)} onKeyDown={onKey} {...swipe}
            onClick={(e) => { if (e.target === e.currentTarget) setZoom(false); }}>
            {zoom && <>
              <img className="lb-img" src={photos[idx].src} alt={alt(idx)} />
              <button type="button" className="lb-x" aria-label="Хаах" onClick={() => setZoom(false)}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
              {nav}
              {n > 1 && <span className="gallery-count" aria-live="polite">{idx + 1} / {n}</span>}
            </>}
          </dialog>
        </>
      ) : <div className="gallery-main"><img src={NOIMG} alt="" /></div>}
    </>
  );
}
