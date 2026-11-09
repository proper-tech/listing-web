// Энгийн зургуудаас 360° панорама хийх холбогч (Mode B), бүхэлдээ хөтөч дээр ажиллана.
// Алхам: цилиндр проекц → хөрш зургуудын шилжилтийг NCC-ээр олох → тойргийг хаах →
// зөөлөн холих → equirectangular (2:1) болгох → тааз, шалны дутуу хэсгийг бүдэг өнгөөр нөхөх.

class StitchError extends Error {
  constructor(message, pairs) { super(message); this.name = 'StitchError'; this.pairs = pairs || []; }
}
const tick = () => new Promise((r) => setTimeout(r, 0));

async function loadBitmap(file) {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch { return await createImageBitmap(file); }
}

function toImageData(bmp, H) {
  const W = Math.round(bmp.width * (H / bmp.height));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0, W, H);
  return ctx.getImageData(0, 0, W, H);
}

// Planar photo → cylindrical projection (alpha = valid mask)
function cylWarp(img, f) {
  const { width: w, height: h, data } = img;
  const cw = Math.floor(2 * f * Math.atan(w / 2 / f));
  const out = new Uint8ClampedArray(cw * h * 4);
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  for (let u = 0; u < cw; u++) {
    const th = (u - cw / 2) / f;
    const xs = f * Math.tan(th) + cx;
    if (xs < 0 || xs > w - 1) continue;
    const sc = 1 / Math.cos(th);
    const x0 = Math.floor(xs), x1 = Math.min(x0 + 1, w - 1), fx = xs - x0;
    for (let v = 0; v < h; v++) {
      const ys = (v - cy) * sc + cy;
      if (ys < 0 || ys > h - 1) continue;
      const y0 = Math.floor(ys), y1 = Math.min(y0 + 1, h - 1), fy = ys - y0;
      const i00 = (y0 * w + x0) * 4, i10 = (y0 * w + x1) * 4, i01 = (y1 * w + x0) * 4, i11 = (y1 * w + x1) * 4;
      const o = (v * cw + u) * 4;
      for (let k = 0; k < 3; k++) {
        const a = data[i00 + k] + (data[i10 + k] - data[i00 + k]) * fx;
        const b = data[i01 + k] + (data[i11 + k] - data[i01 + k]) * fx;
        out[o + k] = a + (b - a) * fy;
      }
      out[o + 3] = 255;
    }
  }
  return { w: cw, h, data: out };
}

// Downscaled grey image + mask (block must be fully valid)
function grey(c, s) {
  const W = Math.floor(c.w / s), H = Math.floor(c.h / s);
  const g = new Float32Array(W * H), m = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let sum = 0, ok = 1;
    for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) {
      const i = ((y * s + yy) * c.w + x * s + xx) * 4;
      if (c.data[i + 3] === 0) ok = 0;
      sum += 0.299 * c.data[i] + 0.587 * c.data[i + 1] + 0.114 * c.data[i + 2];
    }
    g[y * W + x] = sum / (s * s); m[y * W + x] = ok;
  }
  return { w: W, h: H, g, m };
}

// Zero-mean normalised cross-correlation; B is placed at (dx,dy) in A's coordinates
function ncc(A, B, dx, dy, step) {
  let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
  const x0 = Math.max(0, dx), x1 = Math.min(A.w, B.w + dx);
  const y0 = Math.max(0, dy), y1 = Math.min(A.h, B.h + dy);
  for (let y = y0; y < y1; y += step) {
    const ra = y * A.w, rb = (y - dy) * B.w - dx;
    for (let x = x0; x < x1; x += step) {
      const ia = ra + x, ib = rb + x;
      if (!A.m[ia] || !B.m[ib]) continue;
      const a = A.g[ia], b = B.g[ib];
      n++; sa += a; sb += b; saa += a * a; sbb += b * b; sab += a * b;
    }
  }
  if (n < 40) return { score: -1, n, tex: 0 };
  const ma = sa / n, mb = sb / n;
  const va = saa / n - ma * ma, vb = sbb / n - mb * mb;
  return { score: (sab / n - ma * mb) / Math.sqrt(va * vb + 1e-6), n, tex: Math.min(va, vb) };
}

function alignPair(A8, B8, A2, B2) {
  let best = { score: -2 };
  const lo = Math.round(A8.w * 0.12), hi = Math.round(A8.w * 0.9);
  const minN = A8.h * A8.w * 0.06;
  for (let dx = lo; dx <= hi; dx++) for (let dy = -6; dy <= 6; dy++) {
    const r = ncc(A8, B8, dx, dy, 1);
    if (r.n >= minN && r.score > best.score) best = { ...r, dx, dy };
  }
  if (best.score < -1) return { ok: false, score: -1, tex: 0 };
  let ref = { score: -2 };
  const cx = best.dx * 4, cy = best.dy * 4;
  for (let dx = cx - 6; dx <= cx + 6; dx++) for (let dy = cy - 6; dy <= cy + 6; dy++) {
    const r = ncc(A2, B2, dx, dy, 2);
    if (r.score > ref.score) ref = { ...r, dx, dy };
  }
  return { ok: true, dx: ref.dx * 2, dy: ref.dy * 2, score: ref.score, tex: best.tex };
}

async function alignAll(imgs, f, progress, p0, p1) {
  const cyl = [];
  for (let i = 0; i < imgs.length; i++) {
    cyl.push(cylWarp(imgs[i], f));
    progress(p0 + (p1 - p0) * 0.4 * (i + 1) / imgs.length, 'Зургуудыг цилиндр хэлбэрт оруулж байна');
    await tick();
  }
  const g8 = cyl.map((c) => grey(c, 8)), g2 = cyl.map((c) => grey(c, 2));
  const N = cyl.length, pairs = [];
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    pairs.push({ i, j, ...alignPair(g8[i], g8[j], g2[i], g2[j]) });
    progress(p0 + (p1 - p0) * (0.4 + 0.6 * (i + 1) / N), `Давхцал хайж байна (${i + 1}/${N})`);
    await tick();
  }
  return { cyl, pairs };
}

function pairProblems(pairs) {
  const msgs = [];
  for (const p of pairs) {
    const a = p.i + 1, b = p.j + 1;
    if (p.ok && p.tex < 12) msgs.push(`${a} ба ${b}-р зургийн давхцах хэсэг хэт хоосон (цагаан хана) байна — тавилга, цонх зэрэг зүйлтэй хэсгийг давхцуулж авна уу.`);
    else if (!p.ok || p.score < 0.55) {
      msgs.push(p.j === 0
        ? `Сүүлийн (${a}) болон эхний (1) зураг давхцахгүй байна — бүтэн тойрог эргэж, эхний зурагтайгаа давхцуулж дуусгана уу.`
        : `${a} ба ${b}-р зураг хангалттай давхцаагүй байна — дахин авна уу (зураг бүр өмнөхөөсөө ~1/3-ээр давхцах ёстой).`);
    }
  }
  return msgs;
}

async function stitch(fileList, opts = {}) {
  const fov = opts.fov || 65;
  const workH = opts.workH || 900;
  const maxOut = opts.maxOut || 6000;
  const progress = opts.onProgress || (() => {});
  let files = [...fileList];
  if (files.length < 4) throw new StitchError('Хамгийн багадаа 4 зураг хэрэгтэй (8–16 зураг санал болгоно).');
  files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  progress(0.02, 'Зургуудыг уншиж байна');
  const bmps = [];
  for (const f of files) bmps.push(await loadBitmap(f));
  const W0 = bmps[0].width, H0 = bmps[0].height;
  bmps.forEach((b, i) => {
    if (b.width !== W0 || b.height !== H0) throw new StitchError(`${i + 1}-р зураг бусдаасаа өөр хэмжээтэй (${b.width}×${b.height}). Бүх зургийг нэг камераар, ижил zoom-оор авна уу.`);
  });
  const H = Math.min(workH, H0);
  let imgs = bmps.map((b) => toImageData(b, H));
  bmps.forEach((b) => b.close && b.close());
  const w = imgs[0].width;
  let f = (w / 2) / Math.tan((fov * Math.PI) / 360);

  // Pass 1 (and an optional pass 2 that re-estimates the lens from the loop length)
  let res = null, reversed = false;
  for (let pass = 0; pass < 2; pass++) {
    let r = await alignAll(imgs, f, progress, 0.05 + pass * 0.3, 0.3 + pass * 0.3);
    let problems = pairProblems(r.pairs);
    if (problems.length && pass === 0) {
      // Maybe the seller turned left — try the reverse order once
      const rev = await alignAll(imgs.slice().reverse(), f, progress, 0.3, 0.55);
      if (pairProblems(rev.pairs).length < problems.length) { imgs = imgs.slice().reverse(); reversed = true; r = rev; problems = pairProblems(rev.pairs); }
    }
    if (problems.length) {
      if (reversed) problems.unshift('(Зургуудыг эсрэг дарааллаар уншсан.)');
      throw new StitchError(problems.join('\n'), r.pairs);
    }
    const C = r.pairs.reduce((s, p) => s + p.dx, 0);
    const ratio = C / (2 * Math.PI * f);
    if (ratio < 0.6 || ratio > 1.6) throw new StitchError('Зургууд бүтэн 360° тойрог үүсгэхгүй байна. Нэг цэг дээр зогсоод бүтэн эргэж авна уу.');
    res = { ...r, C };
    if (pass === 0 && Math.abs(ratio - 1) > 0.03) { f = C / (2 * Math.PI); continue; }
    break;
  }

  // Place images on a cylinder strip and close the loop (spread vertical drift)
  progress(0.65, 'Зургуудыг нэгтгэж байна');
  const { cyl, pairs, C } = res;
  const N = cyl.length, cw = cyl[0].w, ch = cyl[0].h;
  const xs = [0], ys = [0];
  for (let i = 1; i < N; i++) { xs.push(xs[i - 1] + pairs[i - 1].dx); ys.push(ys[i - 1] + pairs[i - 1].dy); }
  const drift = ys[N - 1] + pairs[N - 1].dy;
  for (let i = 0; i < N; i++) ys[i] -= drift * (xs[i] / C);
  const minY = Math.min(...ys);
  const Cw = Math.round(C), Hc = Math.ceil(Math.max(...ys) - minY) + ch;
  const acc = new Float32Array(Cw * Hc * 3), wsum = new Float32Array(Cw * Hc);
  for (let i = 0; i < N; i++) {
    const ox = Math.round(xs[i]), oy = Math.round(ys[i] - minY), d = cyl[i].data;
    for (let u = 0; u < cw; u++) {
      const wu = Math.min(u + 1, cw - u);
      const X = (ox + u) % Cw;
      for (let v = 0; v < ch; v++) {
        const s = (v * cw + u) * 4;
        if (!d[s + 3]) continue;
        const wt = wu * Math.min(1, Math.min(v + 1, ch - v) / 20);
        const o = (oy + v) * Cw + X;
        acc[o * 3] += d[s] * wt; acc[o * 3 + 1] += d[s + 1] * wt; acc[o * 3 + 2] += d[s + 2] * wt;
        wsum[o] += wt;
      }
    }
    progress(0.65 + 0.15 * (i + 1) / N, 'Зургуудыг нэгтгэж байна');
    await tick();
  }
  for (let o = 0; o < Cw * Hc; o++) if (wsum[o] > 0) { acc[o * 3] /= wsum[o]; acc[o * 3 + 1] /= wsum[o]; acc[o * 3 + 2] /= wsum[o]; }

  // Per-column valid range + soft colours for ceiling/floor fill
  const top = new Int32Array(Cw), bot = new Int32Array(Cw);
  const topC = new Float32Array(Cw * 3), botC = new Float32Array(Cw * 3);
  for (let x = 0; x < Cw; x++) {
    let t = 0; while (t < Hc && wsum[t * Cw + x] <= 0) t++;
    let b = Hc - 1; while (b > t && wsum[b * Cw + x] <= 0) b--;
    t += 2; b -= 2; top[x] = t; bot[x] = b;
    for (let k = 0; k < 3; k++) {
      let st = 0, sb = 0;
      for (let r = 0; r < 10; r++) { st += acc[((t + r) * Cw + x) * 3 + k]; sb += acc[((b - r) * Cw + x) * 3 + k]; }
      topC[x * 3 + k] = st / 10; botC[x * 3 + k] = sb / 10;
    }
  }
  const blurWrap = (arr, rad) => {
    let src = arr;
    for (let pass = 0; pass < 3; pass++) {
      const out = new Float32Array(src.length);
      for (let k = 0; k < 3; k++) {
        let s = 0;
        for (let i = -rad; i <= rad; i++) s += src[(((i % Cw) + Cw) % Cw) * 3 + k];
        for (let x = 0; x < Cw; x++) {
          out[x * 3 + k] = s / (2 * rad + 1);
          s += src[((x + rad + 1) % Cw) * 3 + k] - src[(((x - rad) % Cw + Cw) % Cw) * 3 + k];
        }
      }
      src = out;
    }
    return src;
  };
  const topNear = blurWrap(topC, Math.max(2, Math.round(Cw / 80))), botNear = blurWrap(botC, Math.max(2, Math.round(Cw / 80)));
  const pole = (arr) => { const p = [0, 0, 0]; for (let x = 0; x < Cw; x++) for (let k = 0; k < 3; k++) p[k] += arr[x * 3 + k] / Cw; return p; };
  const poleTop = pole(topC), poleBot = pole(botC);

  // Cylinder → equirectangular
  progress(0.82, '360° зураг үүсгэж байна');
  let outW = Math.min(maxOut, Cw); outW -= outW % 2;
  const outH = outW / 2;
  const canvas = document.createElement('canvas');
  canvas.width = outW; canvas.height = outH;
  const ctx = canvas.getContext('2d');
  const out = ctx.createImageData(outW, outH);
  const od = out.data;
  const fx = Cw / (2 * Math.PI);
  const yc = ys.reduce((s, y) => s + (y - minY), 0) / N + ch / 2;
  const x0 = cw / 2; // first photo's centre = yaw 0
  const smooth = (t) => t * t * (3 - 2 * t);
  for (let py = 0; py < outH; py++) {
    const pitch = Math.PI / 2 - ((py + 0.5) / outH) * Math.PI;
    const vy = yc - f * Math.tan(pitch);
    for (let px = 0; px < outW; px++) {
      const yaw = ((px + 0.5) / outW - 0.5) * 2 * Math.PI;
      let X = x0 + yaw * fx; X = ((X % Cw) + Cw) % Cw;
      const xi = Math.min(Cw - 1, Math.floor(X));
      const o = (py * outW + px) * 4;
      let r, g, b;
      if (vy >= top[xi] && vy <= bot[xi] - 1) {
        const y0 = Math.floor(vy), fy = vy - y0, x1 = (xi + 1) % Cw, fxx = X - xi;
        const i00 = (y0 * Cw + xi) * 3, i10 = (y0 * Cw + x1) * 3, i01 = ((y0 + 1) * Cw + xi) * 3, i11 = ((y0 + 1) * Cw + x1) * 3;
        const lerp2 = (k) => { const a = acc[i00 + k] + (acc[i10 + k] - acc[i00 + k]) * fxx; const c = acc[i01 + k] + (acc[i11 + k] - acc[i01 + k]) * fxx; return a + (c - a) * fy; };
        r = lerp2(0); g = lerp2(1); b = lerp2(2);
        // soften the hard edge near the fill boundary
        const edgeDist = Math.min(vy - top[xi], bot[xi] - vy);
        if (edgeDist < 12) {
          const t = 1 - edgeDist / 12, near = vy - top[xi] < bot[xi] - vy ? topNear : botNear;
          r += (near[xi * 3] - r) * t * 0.6; g += (near[xi * 3 + 1] - g) * t * 0.6; b += (near[xi * 3 + 2] - b) * t * 0.6;
        }
      } else {
        const up = vy < top[xi];
        const edgeRow = up ? top[xi] : bot[xi];
        const pe = Math.atan((yc - edgeRow) / f);
        const t = up ? (pitch - pe) / (Math.PI / 2 - pe) : (pe - pitch) / (Math.PI / 2 + pe);
        const near = up ? topNear : botNear, p = up ? poleTop : poleBot;
        const s = smooth(Math.max(0, Math.min(1, t * 1.6)));
        r = near[xi * 3] + (p[0] - near[xi * 3]) * s;
        g = near[xi * 3 + 1] + (p[1] - near[xi * 3 + 1]) * s;
        b = near[xi * 3 + 2] + (p[2] - near[xi * 3 + 2]) * s;
      }
      od[o] = r; od[o + 1] = g; od[o + 2] = b; od[o + 3] = 255;
    }
    if (py % 200 === 0) { progress(0.82 + 0.16 * py / outH, '360° зураг үүсгэж байна'); await tick(); }
  }
  ctx.putImageData(out, 0, 0);
  progress(1, 'Бэлэн');
  const lensDeg = (2 * Math.atan(w / 2 / f) * 180) / Math.PI;
  return { canvas, width: outW, height: outH, photos: N, lensDeg, reversed, scores: pairs.map((p) => p.score) };
}

export { stitch, StitchError };
