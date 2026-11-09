'use client';
import { useState } from 'react';
import type { Img, Tour } from '@/lib/types';
import { NOIMG } from '@/lib/constants';
import TourViewer from './TourViewer';

export default function ListingMedia({ photos, tour, startWithTour }: { photos: Img[]; tour?: Tour; startWithTour: boolean }) {
  const readyRooms = tour ? tour.rooms.filter((r) => r.status === 'ready').length : 0;
  const [mode, setMode] = useState<'photos' | 'tour'>((startWithTour && readyRooms) || !photos.length ? 'tour' : 'photos');
  const [idx, setIdx] = useState(0);
  const go = (i: number) => setIdx((i + photos.length) % photos.length);

  return (
    <>
      <div className="media-tabs">
        {photos.length > 0 && <button className={`btn btn-sm ${mode === 'photos' ? 'btn-primary' : ''}`} onClick={() => setMode('photos')}>📷 Зураг ({photos.length})</button>}
        {readyRooms > 0 && <button className={`btn btn-sm ${mode === 'tour' ? 'btn-primary' : ''}`} onClick={() => setMode('tour')}>🔄 360° аялал ({readyRooms} өрөө)</button>}
      </div>
      {mode === 'tour' && tour && readyRooms > 0 ? <TourViewer tour={tour} /> : photos.length ? (
        <>
          <div className="gallery-main">
            <img src={photos[idx].src} alt="" />
            {photos.length > 1 && <>
              <button className="gallery-nav prev" aria-label="Өмнөх" onClick={() => go(idx - 1)}>‹</button>
              <button className="gallery-nav next" aria-label="Дараах" onClick={() => go(idx + 1)}>›</button>
            </>}
          </div>
          <div className="thumbs">
            {photos.map((p, i) => <img key={p.src + i} src={p.src} alt="" className={i === idx ? 'on' : ''} onClick={() => setIdx(i)} />)}
          </div>
        </>
      ) : <div className="gallery-main"><img src={NOIMG} alt="" /></div>}
    </>
  );
}
