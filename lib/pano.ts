'use client';
/* Panorama upload prep for "Бэлэн 360° / панорама" rooms.
 *
 * Two kinds of image are accepted:
 *   - full 360° sphere (equirectangular, width ≈ 2 × height): used as is;
 *   - wide panorama, e.g. iPhone "Pano" (≈ 4–5 : 1): a horizontal band that covers part or all of the circle
 *     but only ~60–70° top to bottom. Shown as a partial panorama: Pannellum is told how many degrees the
 *     image covers (haov / vaov) and keeps the view inside it, so nothing is stretched over a whole sphere.
 *
 * Phone pano files carry no angle metadata, so the horizontal coverage is estimated from the shape
 * (the seller can correct it in the room editor). */
import { canvasToBlob, loadBitmap } from './images';
import type { TourRoom } from './types';

/** Vertical angle a phone's main camera covers in Pano mode (phone held upright). */
const PANO_VFOV = 63;
const MAX_W = 8192; // widest texture Pannellum can show on most phones

export type PreparedPano = {
  blob: Blob; width: number; height: number; origW: number; origH: number;
  /** horizontal / vertical coverage in degrees; undefined = full sphere */
  haov?: number; vaov?: number;
};

export class PanoError extends Error {}

/** Horizontal coverage → vertical coverage for an image of this size (same degrees per pixel both ways). */
export const vaovFor = (haov: number, w: number, h: number) => Math.min(180, Math.round(haov * (h / w) * 10) / 10);

/** Rows at the top/bottom that are mostly black: the ragged edge phones leave on a pano. */
function blackEdges(bmp: ImageBitmap): [number, number] {
  const w = Math.min(1024, bmp.width), h = Math.max(1, Math.round(bmp.height * (w / bmp.width)));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const blackShare = (y: number) => {
    let n = 0;
    for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (px[i] + px[i + 1] + px[i + 2] < 36) n++; }
    return n / w;
  };
  const cap = Math.floor(h * 0.12); // never trim more than 12% per side
  let top = 0, bottom = 0;
  while (top < cap && blackShare(top) > 0.015) top++;
  while (bottom < cap && blackShare(h - 1 - bottom) > 0.015) bottom++;
  const k = bmp.height / h;
  return [Math.round(top * k), Math.round(bottom * k)];
}

export async function preparePano(file: Blob): Promise<PreparedPano> {
  const bmp = await loadBitmap(file);
  try {
    const W = bmp.width, H = bmp.height, ratio = W / H;
    if (ratio < 1.95) throw new PanoError(`Энэ зураг панорама биш байна (${W}×${H}). 360° зураг 2:1, утасны панорама үүнээс ч өргөн байна.`);
    const full = ratio <= 2.05;
    const [cutTop, cutBottom] = full ? [0, 0] : blackEdges(bmp);
    const srcH = H - cutTop - cutBottom;
    const s = Math.min(1, MAX_W / W);
    const c = document.createElement('canvas');
    c.width = Math.round(W * s); c.height = Math.round(srcH * s);
    c.getContext('2d')!.drawImage(bmp, 0, cutTop, W, srcH, 0, 0, c.width, c.height);
    const out: PreparedPano = { blob: await canvasToBlob(c, 'image/jpeg', 0.9), width: c.width, height: c.height, origW: W, origH: H };
    if (!full) {
      // cylinder model: the full (untrimmed) height spans PANO_VFOV, width = focal × angle
      const f = H / (2 * Math.tan((PANO_VFOV * Math.PI) / 360));
      let haov = Math.round(((W / f) * 180) / Math.PI);
      if (haov >= 345) haov = 360; // close enough: treat as a full circle
      out.haov = Math.max(60, Math.min(360, haov));
      out.vaov = vaovFor(out.haov, c.width, c.height);
    }
    return out;
  } finally {
    bmp.close();
  }
}

/** Pannellum scene settings for a room: limits the view to what a partial panorama covers. */
export function panoView(room: Pick<TourRoom, 'haov' | 'vaov'>): Record<string, unknown> {
  if (!room.vaov || !room.haov) return {};
  const v = room.vaov, h = room.haov;
  return {
    haov: h, vaov: v, vOffset: 0, avoidShowingBackground: true,
    minPitch: -v / 2, maxPitch: v / 2,
    ...(h < 360 ? { minYaw: -h / 2, maxYaw: h / 2 } : {}),
    // the band is short: start zoomed so the view fits inside it, never zoom out past it
    hfov: Math.min(100, h), maxHfov: Math.min(110, h),
  };
}
