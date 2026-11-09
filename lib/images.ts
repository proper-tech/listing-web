'use client';

export async function loadBitmap(file: Blob): Promise<ImageBitmap> {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { return await createImageBitmap(file); }
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', q = 0.88): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Зургийг хадгалж чадсангүй'))), type, q));
}

export async function resizeImage(file: Blob, maxW: number) {
  const bmp = await loadBitmap(file);
  const s = Math.min(1, maxW / bmp.width);
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  const out = { blob: await canvasToBlob(c), width: c.width, height: c.height, origW: bmp.width, origH: bmp.height };
  bmp.close();
  return out;
}

export async function upload(blob: Blob): Promise<string> {
  const r = await fetch('/api/upload', { method: 'POST', headers: { 'content-type': blob.type || 'application/octet-stream' }, body: blob });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error || 'Зураг илгээж чадсангүй');
  return (j as { src: string }).src;
}

// Load a classic <script> once (used for Pannellum, which has no ES module build).
const scripts = new Map<string, Promise<void>>();
export function loadScript(src: string): Promise<void> {
  if (!scripts.has(src)) {
    scripts.set(src, new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => res();
      s.onerror = () => { scripts.delete(src); rej(new Error('360° viewer ачаалж чадсангүй')); };
      document.head.appendChild(s);
    }));
  }
  return scripts.get(src)!;
}
