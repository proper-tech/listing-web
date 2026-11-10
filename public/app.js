/* ProperTech — front-end (hash router, no build step) */
'use strict';

/* ---------- constants ---------- */
const CATS = {
  apartment: { name: 'Орон сууц', ico: '🏢' }, house: { name: 'Хашаа байшин', ico: '🏡' }, land: { name: 'Газар', ico: '🌾' },
  office: { name: 'Оффис', ico: '💼' }, shop: { name: 'Худалдаа, үйлчилгээний талбай', ico: '🏪' },
  warehouse: { name: 'Үйлдвэр, агуулах', ico: '🏭' }, garage: { name: 'Гараж, зогсоол', ico: '🚗' }, summer_house: { name: 'Зуслан', ico: '🌲' },
};
const DISTRICTS = ['Баянзүрх', 'Баянгол', 'Сүхбаатар', 'Чингэлтэй', 'Хан-Уул', 'Сонгинохайрхан', 'Налайх', 'Багануур', 'Багахангай'];
const CENTERS = {
  'Баянзүрх': [47.918, 106.975], 'Баянгол': [47.912, 106.862], 'Сүхбаатар': [47.925, 106.918], 'Чингэлтэй': [47.935, 106.905],
  'Хан-Уул': [47.885, 106.905], 'Сонгинохайрхан': [47.918, 106.800], 'Налайх': [47.770, 107.255], 'Багануур': [47.790, 108.370], 'Багахангай': [47.330, 107.470],
};
const UB = [47.915, 106.905];
const PAY_TERMS = ['Бэлэн', 'Банкны зээл', 'Ипотек', 'Бартер'];
const FIELD_DEFS = {
  rooms: { label: 'Өрөө', type: 'number' },
  area: { label: 'Талбай (м²)', type: 'number', req: true },
  floor: { label: 'Хэдэн давхарт', type: 'number' },
  buildingFloors: { label: 'Барилгын давхар', type: 'number' },
  yearInUse: { label: 'Ашиглалтанд орсон он', type: 'number' },
  floorMaterial: { label: 'Шал', type: 'select', options: ['Паркет', 'Ламинат', 'Плита', 'Модон', 'Бусад'] },
  balconies: { label: 'Тагт', type: 'number' },
  windowType: { label: 'Цонх', type: 'select', options: ['Вакуум', 'Төмөр вакуум', 'Мод', 'Бусад'] },
  windowCount: { label: 'Цонхны тоо', type: 'number' },
  doorType: { label: 'Хаалга', type: 'select', options: ['Бүргэд', 'Төмөр', 'Мод', 'Бусад'] },
};
const FIELDS_BY_CAT = {
  apartment: ['rooms', 'area', 'floor', 'buildingFloors', 'yearInUse', 'floorMaterial', 'balconies', 'windowType', 'windowCount', 'doorType'],
  house: ['rooms', 'area', 'buildingFloors', 'yearInUse', 'floorMaterial', 'windowType', 'windowCount', 'doorType'],
  land: ['area'],
  office: ['rooms', 'area', 'floor', 'buildingFloors', 'yearInUse', 'floorMaterial', 'windowType', 'doorType'],
  shop: ['area', 'floor', 'buildingFloors', 'yearInUse', 'floorMaterial'],
  warehouse: ['area', 'yearInUse'],
  garage: ['area'],
  summer_house: ['rooms', 'area', 'yearInUse', 'floorMaterial', 'windowType'],
};
const PLACEMENTS = {
  free: { name: 'Энгийн зар', price: 0, note: '30 хоног, үнэгүй' },
  vip: { name: 'VIP зар', price: 20000, note: '7 хоног, ангилал, хайлтын эхэнд' },
  top: { name: 'Онцгой зар', price: 40000, note: '7 хоног, нүүр хуудсанд' },
};
const ROOM_NAMES = ['Зочны өрөө', 'Гал тогоо', 'Унтлагын өрөө', 'Хүүхдийн өрөө', 'Угаалгын өрөө', 'Коридор', 'Тагт', 'Хашаа', 'Гадна тал'];
const NOIMG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#efe7d4"/><path d="M110 120l40-40 40 40v40h-80z" fill="#d6c8a8"/></svg>');

/* ---------- utils ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
async function api(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Алдаа (${r.status})`);
  return j;
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}
const trimNum = (x) => String(Number(x.toFixed(2)));
function fmtPrice(n) {
  if (n == null) return '';
  if (n >= 1e9) return trimNum(n / 1e9) + ' тэрбум₮';
  if (n >= 1e6) return trimNum(n / 1e6) + ' сая₮';
  return Math.round(n).toLocaleString('en-US').replace(/,/g, ' ') + '₮';
}
const fmtFull = (n) => Math.round(n).toLocaleString('en-US').replace(/,/g, ' ') + '₮';
function timeAgo(iso) {
  const d = new Date(iso), diff = (Date.now() - d) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))} мин өмнө`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (d >= today) return `Өнөөдөр ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d >= today - 864e5) return 'Өчигдөр';
  return `${Math.ceil((today - d) / 864e5)} өдрийн өмнө`;
}
const fmtDate = (iso) => new Date(iso).toLocaleDateString('mn-MN', { year: 'numeric', month: '2-digit', day: '2-digit' });
const priceTag = (l) => `${fmtPrice(l.price)}${l.dealType === 'rent' ? '<small> /сар</small>' : ''}`;
function specLine(l) {
  const p = [];
  if (l.rooms) p.push(`${l.rooms} өрөө`);
  if (l.area) p.push(`${l.area} м²`);
  if (l.floor && l.buildingFloors) p.push(`${l.floor}/${l.buildingFloors} давхар`);
  else if (l.floor) p.push(`${l.floor} давхар`);
  return p.join(' · ');
}
const favs = () => store.get('favs', []);
function toggleFav(id) {
  const f = favs(), i = f.indexOf(id);
  if (i >= 0) f.splice(i, 1); else f.push(id);
  store.set('favs', f); updateFavCount();
  return i < 0;
}
function updateFavCount() { const n = favs().length; $('#favCount').textContent = n ? n : ''; }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
const isFav = (id) => favs().includes(id);
function tileLayer() {
  return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' });
}

/* ---------- image helpers ---------- */
async function loadBitmap(file) {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { return await createImageBitmap(file); }
}
function canvasToBlob(canvas, type = 'image/jpeg', q = 0.88) {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Зургийг хадгалж чадсангүй'))), type, q));
}
async function resizeImage(file, maxW) {
  const bmp = await loadBitmap(file);
  const s = Math.min(1, maxW / bmp.width);
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const out = { blob: await canvasToBlob(c), width: c.width, height: c.height, origW: bmp.width, origH: bmp.height };
  bmp.close && bmp.close();
  return out;
}
async function upload(blob) {
  const r = await fetch('/api/upload', { method: 'POST', headers: { 'content-type': blob.type || 'application/octet-stream' }, body: blob });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Зураг илгээж чадсангүй');
  return j.src;
}

/* ---------- router ---------- */
let cleanups = [];
const onCleanup = (fn) => cleanups.push(fn);
const routes = [
  [/^\/$/, pageHome], [/^\/search$/, pageSearch], [/^\/listing\/(\w+)$/, pageListing], [/^\/post$/, pagePost],
  [/^\/saved$/, pageSaved], [/^\/my$/, pageMy], [/^\/admin$/, pageAdmin], [/^\/help$/, pageHelp], [/^\/pricing$/, pagePricing],
];
function parseHash() {
  const raw = location.hash.slice(1) || '/';
  const [p, qs] = raw.split('?');
  return { path: p || '/', query: new URLSearchParams(qs || '') };
}
async function router() {
  cleanups.forEach((f) => { try { f(); } catch { /* ignore */ } });
  cleanups = [];
  const { path, query } = parseHash();
  const main = $('#app');
  $$('#nav > [data-nav]').forEach((a) => a.classList.toggle('on',
    (a.dataset.nav === 'sale' && path === '/search' && query.get('deal') === 'sale') ||
    (a.dataset.nav === 'rent' && path === '/search' && query.get('deal') === 'rent') ||
    ('/' + a.dataset.nav === path)));
  markMenus();
  closeMenus();
  for (const [re, fn] of routes) {
    const m = path.match(re);
    if (!m) continue;
    main.innerHTML = '<div class="loading">Ачаалж байна…</div>';
    window.scrollTo(0, 0);
    try { await fn(main, query, ...m.slice(1)); setVw(); } catch (e) { main.innerHTML = `<div class="empty">⚠️ ${esc(e.message)}<br><br><a href="#/">Нүүр хуудас</a></div>`; }
    return;
  }
  main.innerHTML = '<div class="empty">Хуудас олдсонгүй. <a href="#/">Нүүр хуудас</a></div>';
}
window.addEventListener('hashchange', router);
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-fav]');
  if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const on = toggleFav(b.dataset.fav);
  $$(`[data-fav="${b.dataset.fav}"]`).forEach((x) => { x.classList.toggle('on', on); if (x.dataset.label) x.textContent = on ? '♥ Хадгалсан' : '♡ Хадгалах'; });
  toast(on ? 'Хадгалсан зарт нэмлээ' : 'Хадгалсан зараас хаслаа');
});

/* ---------- shared components ---------- */
function badges(l) {
  const b = [];
  if (l.promo === 2) b.push('<span class="badge top">Онцгой</span>');
  else if (l.promo === 1) b.push('<span class="badge vip">VIP</span>');
  if (l.hasTour) b.push('<span class="badge b360">360°</span>');
  if (l.tour && l.tour.rooms.some((r) => r.source === 'ai')) b.push('<span class="badge ai">AI</span>');
  if (l.status && l.status !== 'active') b.push(`<span class="badge ${l.status}">${STATUS_MN[l.status] || l.status}</span>`);
  return b.join('');
}
const STATUS_MN = { pending: 'Хянагдаж буй', active: 'Идэвхтэй', expired: 'Хугацаа дууссан', sold: 'Зарагдсан', rejected: 'Татгалзсан', draft: 'Ноорог' };
function card(l) {
  const img = l.photos[0]?.src || l.tour?.rooms?.find((r) => r.panorama)?.panorama.src || NOIMG;
  return `<a class="card ${l.promo === 2 ? 'promo-top' : l.promo === 1 ? 'promo-vip' : ''}" href="#/listing/${esc(l.id)}">
    <div class="card-img"><img loading="lazy" src="${esc(img)}" alt="">
      <div class="badges">${badges(l)}</div>
      <button class="fav ${isFav(l.id) ? 'on' : ''}" data-fav="${esc(l.id)}" aria-label="Хадгалах">♥</button></div>
    <div class="card-body"><div class="price">${priceTag(l)}</div>
      <div class="title">${esc(l.title)}</div>
      <div class="meta">${esc(specLine(l)) || esc(CATS[l.category].name)}</div>
      <div class="loc">${esc(l.location.district)} · ${timeAgo(l.createdAt)}</div></div></a>`;
}
function grid(items, empty = 'Зар олдсонгүй') {
  return items.length ? `<div class="grid">${items.map(card).join('')}</div>` : `<div class="empty">${empty}</div>`;
}

// Multi-room 360° tour (Pannellum). Returns { viewer, destroy }.
function mountTour(container, tour, { showRooms = true } = {}) {
  const rooms = tour.rooms.filter((r) => r.status === 'ready' && r.panorama);
  if (!rooms.length) { container.innerHTML = '<div class="empty">360° аялал бэлэн биш</div>'; return null; }
  const ids = new Set(rooms.map((r) => r.id));
  const scenes = {};
  for (const r of rooms) {
    scenes[r.id] = {
      title: r.name + (r.source === 'ai' ? ' · AI-аар үүсгэсэн, зөвхөн санаа' : ''),
      type: 'equirectangular', panorama: r.panorama.src, yaw: r.startYaw || 0, hfov: 105,
      hotSpots: (r.hotspots || []).filter((h) => ids.has(h.targetRoomId)).map((h) => ({
        pitch: h.pitch, yaw: h.yaw, type: 'scene', sceneId: h.targetRoomId,
        text: h.label || rooms.find((x) => x.id === h.targetRoomId).name,
      })),
    };
  }
  const start = ids.has(tour.startRoomId) ? tour.startRoomId : rooms[0].id;
  const fp = rooms.some((r) => r.floorPlanPosition);
  container.innerHTML = `<div class="tour-wrap"><div class="pano" id="panoEl"></div>
      ${fp ? `<div class="floorplan" title="Байрны план">${rooms.filter((r) => r.floorPlanPosition).map((r) =>
        `<button data-room="${esc(r.id)}" style="left:${r.floorPlanPosition[0]}%;top:${r.floorPlanPosition[1]}%" title="${esc(r.name)}"></button>`).join('')}</div>` : ''}
    </div>
    ${showRooms && rooms.length > 1 ? `<div class="room-chips">${rooms.map((r) => `<button class="chip" data-room="${esc(r.id)}">${esc(r.name)}</button>`).join('')}</div>` : ''}`;
  const viewer = pannellum.viewer($('#panoEl', container), {
    default: { firstScene: start, sceneFadeDuration: 700, autoLoad: true, compass: false },
    scenes,
  });
  const mark = (id) => $$('[data-room]', container).forEach((b) => b.classList.toggle('on', b.dataset.room === id));
  mark(start);
  viewer.on('scenechange', mark);
  $$('[data-room]', container).forEach((b) => b.addEventListener('click', () => viewer.loadScene(b.dataset.room)));
  return { viewer, destroy: () => { try { viewer.destroy(); } catch { /* already gone */ } } };
}

/* ---------- hero video ----------
   Pexels clip 13761469 "Drone Footage of Apartment Buildings" by So Kenobi (Pexels licence: free commercial use,
   no attribution required, editing allowed). 1280x720 rendition, 11.5s, slow drone drift at sunset.
   Loops the whole clip: with a moving camera, a short loop would jump back visibly every few seconds.
   (Previous clip, construction time-lapse 8598739, kept as /video/hero-construction.mp4.) */
const HERO_CLIP = { start: 0, end: Infinity };
function loopHeroVideo(v) {
  if (!v) return;
  // Reduced motion: show a still frame instead of a moving background
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { v.addEventListener('loadedmetadata', () => { v.currentTime = HERO_CLIP.start; }, { once: true }); return; }
  v.addEventListener('loadedmetadata', () => { v.currentTime = HERO_CLIP.start; v.play().catch(() => { /* autoplay blocked: stays on first frame */ }); }, { once: true });
  // timeupdate fires ~4x/second, so the jump back lands within ~0.25s of `end`
  if (HERO_CLIP.end === Infinity) { v.loop = true; return; } // whole clip: native loop
  v.addEventListener('timeupdate', () => { if (v.currentTime >= HERO_CLIP.end) v.currentTime = HERO_CLIP.start; });
}

/* ---------- pages ---------- */
async function pageHome(main) {
  const [stats, top, fresh] = await Promise.all([
    api('/api/stats'), api('/api/listings?placement=top&per=8'), api('/api/listings?sort=new&plain=1&per=12'),
  ]);
  main.innerHTML = `
    <section class="hero">
      <video class="hero-video" id="heroVideo" src="/video/hero.mp4" muted playsinline preload="auto" aria-hidden="true"></video>
      <div class="glass">
      <h1>Ойроос харж орчноо мэдэр</h1>
      <p>${stats.total} идэвхтэй зар · Орон сууц, хашаа байшин, газар, оффис</p>
      <form class="hero-search" id="heroSearch">
        <select name="deal"><option value="sale">Зарах</option><option value="rent">Түрээслэх</option></select>
        <select name="cat"><option value="">Бүх төрөл</option>${Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select>
        <select name="district"><option value="">Бүх дүүрэг</option>${DISTRICTS.map((d) => `<option>${d}</option>`).join('')}</select>
        <input type="number" name="priceMax" placeholder="Дээд үнэ (₮)" min="0">
        <button class="btn btn-accent">Хайх</button>
      </form>
      </div>
    </section>
    ${top.items.length ? `<div class="section-head"><h2>Онцгой зар</h2></div>${grid(top.items)}` : ''}
    <div class="section-head"><h2>Шинэ зар</h2><a href="#/search?sort=new">Бүгдийг харах →</a></div>
    ${grid(fresh.items)}
    <div class="section-head"><h2>360° аялалтай зар</h2><a href="#/search?tour=1">Бүгдийг харах →</a></div>
    <div id="tourList"><div class="loading">…</div></div>`;
  loopHeroVideo($('#heroVideo'));
  $('#heroSearch').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = new URLSearchParams();
    for (const [k, v] of new FormData(e.target)) if (v) q.set(k, v);
    location.hash = '#/search?' + q;
  });
  const tours = await api('/api/listings?tour=1&per=4');
  $('#tourList').innerHTML = grid(tours.items);
}

function filterForm(q) {
  const v = (k) => esc(q.get(k) || '');
  const sel = (k, val) => (q.get(k) === val ? 'selected' : '');
  const chk = (k) => (q.get(k) === '1' ? 'checked' : '');
  const rooms = (q.get('rooms') || '').split(',');
  return `<form id="filterForm">
    <h3>Төрөл</h3>
    <div class="seg" style="margin-bottom:8px"><button type="button" data-deal="sale" class="${q.get('deal') !== 'rent' ? 'on' : ''}">Зарах</button><button type="button" data-deal="rent" class="${q.get('deal') === 'rent' ? 'on' : ''}">Түрээслэх</button></div>
    <input type="hidden" name="deal" value="${q.get('deal') === 'rent' ? 'rent' : 'sale'}">
    <select name="cat"><option value="">Бүх ангилал</option>${Object.entries(CATS).map(([k, c]) => `<option value="${k}" ${sel('cat', k)}>${c.name}</option>`).join('')}</select>
    <h3>Түлхүүр үг</h3><input type="search" name="q" value="${v('q')}" placeholder="Жишээ нь: Зайсан, хотхон">
    <h3>Байршил</h3>
    <select name="district"><option value="">Бүх дүүрэг</option>${DISTRICTS.map((d) => `<option ${sel('district', d)}>${d}</option>`).join('')}</select>
    <h3>Үнэ (₮)</h3><div class="row2"><input type="number" name="priceMin" placeholder="Доод" value="${v('priceMin')}"><input type="number" name="priceMax" placeholder="Дээд" value="${v('priceMax')}"></div>
    <h3>м² үнэ (₮)</h3><div class="row2"><input type="number" name="ppmMin" placeholder="Доод" value="${v('ppmMin')}"><input type="number" name="ppmMax" placeholder="Дээд" value="${v('ppmMax')}"></div>
    <h3>Өрөө</h3><div class="chips">${[1, 2, 3, 4, 5].map((r) => `<label class="chip"><input type="checkbox" name="rooms" value="${r}" ${rooms.includes(String(r)) ? 'checked' : ''}>${r === 5 ? '5+' : r}</label>`).join('')}</div>
    <h3>Талбай (м²)</h3><div class="row2"><input type="number" name="areaMin" placeholder="Доод" value="${v('areaMin')}"><input type="number" name="areaMax" placeholder="Дээд" value="${v('areaMax')}"></div>
    <h3>Хэдэн давхарт</h3><div class="row2"><input type="number" name="floorMin" placeholder="Доод" value="${v('floorMin')}"><input type="number" name="floorMax" placeholder="Дээд" value="${v('floorMax')}"></div>
    <label class="check"><input type="checkbox" name="notFirst" value="1" ${chk('notFirst')}> 1-р давхар биш</label>
    <label class="check"><input type="checkbox" name="notLast" value="1" ${chk('notLast')}> Сүүлийн давхар биш</label>
    <h3>Барилгын давхар</h3><div class="row2"><input type="number" name="bfMin" placeholder="Доод" value="${v('bfMin')}"><input type="number" name="bfMax" placeholder="Дээд" value="${v('bfMax')}"></div>
    <h3>Ашиглалтанд орсон он</h3><div class="row2"><input type="number" name="yearMin" placeholder="Доод" value="${v('yearMin')}"><input type="number" name="yearMax" placeholder="Дээд" value="${v('yearMax')}"></div>
    <h3>Нэмэлт</h3>
    <label class="check"><input type="checkbox" name="tour" value="1" ${chk('tour')}> 360° аялалтай</label>
    <label class="check"><input type="checkbox" name="leasing" value="1" ${chk('leasing')}> Лизингээр авах боломжтой</label>
    <label class="check"><input type="checkbox" name="garage" value="1" ${chk('garage')}> Гаражтай</label>
    <h3>Нийтэлсэн</h3>
    <select name="posted"><option value="">Хамаагүй</option><option value="1" ${sel('posted', '1')}>Өнөөдөр</option><option value="3" ${sel('posted', '3')}>Сүүлийн 3 өдөр</option><option value="7" ${sel('posted', '7')}>Сүүлийн 7 хоног</option></select>
    <h3>Зар оруулагч</h3>
    <select name="seller"><option value="">Бүгд</option><option value="owner" ${sel('seller', 'owner')}>Эзэмшигч</option><option value="agent" ${sel('seller', 'agent')}>Агент</option></select>
    <button type="button" class="btn btn-block" id="resetFilters" style="margin-top:14px">Шүүлтүүр цэвэрлэх</button>
  </form>`;
}

async function pageSearch(main, query) {
  let view = store.get('view', 'list');
  main.innerHTML = `<div class="search-layout">
    <aside class="filters" id="filters">${filterForm(query)}</aside>
    <section>
      <div class="results-bar">
        <button class="btn filters-toggle" id="filtersToggle">☰ Шүүлтүүр</button>
        <b id="count" class="grow"></b>
        <select id="sort" aria-label="Эрэмбэ">
          <option value="new">Шинэ эхэндээ</option><option value="cheap">Хямд эхэндээ</option><option value="expensive">Үнэтэй эхэндээ</option>
          <option value="ppm2">м² үнэ (бага)</option><option value="area">Талбай (их)</option></select>
        <div class="seg"><button data-view="list">Жагсаалт</button><button data-view="map">Газрын зураг</button></div>
      </div>
      <div id="results"></div><div id="map" class="map hidden"></div><div class="pager" id="pager"></div>
    </section></div>`;
  const form = $('#filterForm');
  $('#sort').value = query.get('sort') || 'new';
  let map = null, layer = null, page = Number(query.get('page')) || 1;
  onCleanup(() => map && map.remove());

  const currentQuery = () => {
    const q = new URLSearchParams();
    const fd = new FormData(form);
    const rooms = fd.getAll('rooms');
    for (const [k, val] of fd) if (val && k !== 'rooms') q.set(k, val);
    if (rooms.length) q.set('rooms', rooms.join(','));
    if ($('#sort').value !== 'new') q.set('sort', $('#sort').value);
    if (page > 1) q.set('page', page);
    return q;
  };
  async function load() {
    const q = currentQuery();
    history.replaceState(null, '', '#/search?' + q);
    const apiQ = new URLSearchParams(q);
    if (view === 'map') { apiQ.set('per', 60); apiQ.delete('page'); }
    const res = await api('/api/listings?' + apiQ);
    $('#count').textContent = `${res.total} зар`;
    $('#results').classList.toggle('hidden', view === 'map');
    $('#map').classList.toggle('hidden', view !== 'map');
    $$('[data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === view));
    if (view === 'list') {
      $('#results').innerHTML = grid(res.items, 'Таны шүүлтүүрт тохирох зар олдсонгүй. Шүүлтүүрээ багасгаад үзээрэй.');
      const pages = Math.ceil(res.total / res.per);
      $('#pager').innerHTML = pages > 1 ? Array.from({ length: pages }, (_, i) => `<button class="btn btn-sm ${i + 1 === page ? 'btn-primary' : ''}" data-page="${i + 1}">${i + 1}</button>`).join('') : '';
    } else {
      $('#pager').innerHTML = '';
      if (!map) { map = L.map('map').setView(UB, 12); tileLayer().addTo(map); layer = L.layerGroup().addTo(map); }
      setTimeout(() => map.invalidateSize(), 50);
      layer.clearLayers();
      const pts = [];
      for (const l of res.items) {
        const cls = l.promo === 2 ? 'top' : l.promo === 1 ? 'vip' : '';
        const m = L.marker([l.location.lat, l.location.lng], {
          icon: L.divIcon({ className: '', html: `<span class="map-pin ${cls}">${fmtPrice(l.price).replace('₮', '')}</span>`, iconSize: null }),
        });
        m.bindPopup(`<div style="width:200px"><img src="${esc(l.photos[0] ? l.photos[0].src : NOIMG)}" style="border-radius:6px;margin-bottom:6px"><b>${priceTag(l)}</b><br>${esc(l.title)}<br><a href="#/listing/${esc(l.id)}">Дэлгэрэнгүй →</a></div>`);
        m.addTo(layer); pts.push([l.location.lat, l.location.lng]);
      }
      if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 14 });
    }
  }
  const reload = debounce(() => { page = 1; load(); }, 300);
  form.addEventListener('input', reload);
  form.addEventListener('change', reload);
  form.addEventListener('submit', (e) => e.preventDefault());
  $$('[data-deal]', form).forEach((b) => b.addEventListener('click', () => {
    form.deal.value = b.dataset.deal;
    $$('[data-deal]', form).forEach((x) => x.classList.toggle('on', x === b));
    reload();
  }));
  $('#resetFilters').addEventListener('click', () => {
    const deal = form.deal.value; form.reset(); form.deal.value = deal;
    $$('input[type=search],input[type=number]', form).forEach((i) => { i.value = ''; });
    $$('select', form).forEach((s) => { s.value = ''; });
    $$('input[type=checkbox]', form).forEach((c) => { c.checked = false; });
    reload();
  });
  $('#sort').addEventListener('change', () => { page = 1; load(); });
  $$('[data-view]').forEach((b) => b.addEventListener('click', () => { view = b.dataset.view; store.set('view', view); load(); }));
  $('#pager').addEventListener('click', (e) => { const b = e.target.closest('[data-page]'); if (b) { page = Number(b.dataset.page); load(); window.scrollTo(0, 0); } });
  $('#filtersToggle').addEventListener('click', () => $('#filters').classList.toggle('open'));
  await load();
}

async function pageListing(main, query, id) {
  const l = await api(`/api/listings/${encodeURIComponent(id)}`);
  document.title = `${l.title} — ProperTech`;
  onCleanup(() => { document.title = 'ProperTech — Үл хөдлөх хөрөнгийн зар, 360° аялал'; });
  const specs = [
    ['Ангилал', CATS[l.category].name], ['Төрөл', l.dealType === 'rent' ? 'Түрээслэх' : 'Зарах'],
    ['Өрөө', l.rooms], ['Талбай', l.area && `${l.area} м²`], ['м² үнэ', l.pricePerM2 && fmtFull(l.pricePerM2)],
    ['Хэдэн давхарт', l.floor], ['Барилгын давхар', l.buildingFloors], ['Ашиглалтанд орсон он', l.yearInUse],
    ['Шал', l.floorMaterial], ['Тагт', l.balconies], ['Цонх', l.windowType], ['Цонхны тоо', l.windowCount],
    ['Хаалга', l.doorType], ['Гараж', l.garage ? 'Байгаа' : null], ['Лизинг', l.leasing ? 'Боломжтой' : 'Боломжгүй'],
    ['Төлбөрийн нөхцөл', (l.paymentTerms || []).join(', ')],
    ['Байршил', [l.location.district, l.location.khoroo, l.location.address].filter(Boolean).join(', ')],
  ].filter(([, v]) => v !== undefined && v !== null && v !== '');
  const ph = l.photos.length ? l.photos : [];
  main.innerHTML = `
    <div class="crumbs"><a href="#/">Нүүр</a> › <a href="#/search?deal=${l.dealType}">${l.dealType === 'rent' ? 'Түрээслэх' : 'Зарах'}</a> › <a href="#/search?deal=${l.dealType}&cat=${l.category}">${CATS[l.category].name}</a> › ${esc(l.location.district)}</div>
    <div class="listing">
      <div>
        <div class="panel">
          <h1>${esc(l.title)}</h1>
          <div class="badges" style="position:static;margin-bottom:10px">${badges(l)}</div>
          <div class="media-tabs">
            ${ph.length ? '<button class="btn btn-sm" data-media="photos">📷 Зураг (' + ph.length + ')</button>' : ''}
            ${l.hasTour ? `<button class="btn btn-sm" data-media="tour">🔄 360° аялал (${l.tour.rooms.filter((r) => r.status === 'ready').length} өрөө)</button>` : ''}
          </div>
          <div id="media"></div>
        </div>
        <div class="panel" style="margin-top:16px"><h2 style="margin-top:0">Дэлгэрэнгүй</h2>
          <dl class="specs">${specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
          ${l.description ? `<h3>Тайлбар</h3><p class="desc">${esc(l.description)}</p>` : ''}
          <h3>Байршил</h3><div class="mini-map" id="miniMap"></div>
        </div>
      </div>
      <aside class="side">
        <div class="panel">
          <div class="price">${priceTag(l)}</div>
          ${l.pricePerM2 ? `<div class="muted small">м² — ${fmtFull(l.pricePerM2)}</div>` : ''}
          <div class="seller" style="margin:16px 0">
            <div class="avatar">${esc(l.sellerName.slice(0, 1))}</div>
            <div><b>${esc(l.sellerName)}</b><div class="muted small">${l.sellerType === 'owner' ? 'Эзэмшигч' : 'Агент'}</div></div>
          </div>
          <button class="btn btn-primary btn-block" id="showPhone">📞 Утасны дугаар харах</button>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button class="btn btn-block ${isFav(l.id) ? 'on' : ''}" data-fav="${esc(l.id)}" data-label="1">${isFav(l.id) ? '♥ Хадгалсан' : '♡ Хадгалах'}</button>
            <button class="btn btn-block" id="share">↗ Хуваалцах</button>
          </div>
        </div>
        <div class="panel">
          <div class="kv"><span>Зарын дугаар</span><b>${esc(l.id)}</b></div>
          <div class="kv"><span>Нийтэлсэн</span><span>${fmtDate(l.createdAt)} (${timeAgo(l.createdAt)})</span></div>
          <div class="kv"><span>Үзсэн</span><span>${l.views}</span></div>
          <button class="btn btn-sm btn-danger" id="report" style="margin-top:10px">⚑ Зарыг мэдээлэх</button>
        </div>
      </aside>
    </div>
    <h2>Төстэй зар</h2><div id="similar"><div class="loading">…</div></div>`;

  // media
  let tourHandle = null, idx = 0;
  onCleanup(() => tourHandle && tourHandle.destroy());
  const showPhotos = () => {
    if (tourHandle) { tourHandle.destroy(); tourHandle = null; }
    $('#media').innerHTML = `<div class="gallery-main"><img id="mainImg" src="${esc(ph[0].src)}" alt="">
      ${ph.length > 1 ? '<button class="gallery-nav prev" aria-label="Өмнөх">‹</button><button class="gallery-nav next" aria-label="Дараах">›</button>' : ''}</div>
      <div class="thumbs">${ph.map((p, i) => `<img src="${esc(p.src)}" data-i="${i}" class="${i === 0 ? 'on' : ''}" alt="">`).join('')}</div>`;
    const go = (i) => { idx = (i + ph.length) % ph.length; $('#mainImg').src = ph[idx].src; $$('.thumbs img').forEach((t, j) => t.classList.toggle('on', j === idx)); };
    $$('.thumbs img').forEach((t) => t.addEventListener('click', () => go(Number(t.dataset.i))));
    const p = $('.gallery-nav.prev'), n = $('.gallery-nav.next');
    if (p) { p.addEventListener('click', () => go(idx - 1)); n.addEventListener('click', () => go(idx + 1)); }
  };
  const showTour = () => { tourHandle = mountTour($('#media'), l.tour); };
  const setMedia = (m) => { $$('[data-media]').forEach((b) => b.classList.toggle('btn-primary', b.dataset.media === m)); m === 'tour' ? showTour() : showPhotos(); };
  $$('[data-media]').forEach((b) => b.addEventListener('click', () => setMedia(b.dataset.media)));
  if (query.get('tour') === '1' && l.hasTour) setMedia('tour');
  else if (ph.length) setMedia('photos');
  else if (l.hasTour) setMedia('tour');
  else $('#media').innerHTML = `<div class="gallery-main"><img src="${NOIMG}" alt=""></div>`;

  // map
  const mm = L.map('miniMap', { scrollWheelZoom: false }).setView([l.location.lat, l.location.lng], 14);
  tileLayer().addTo(mm);
  L.circle([l.location.lat, l.location.lng], { radius: 250, color: '#b48a45' }).addTo(mm);
  onCleanup(() => mm.remove());

  $('#showPhone').addEventListener('click', async (e) => {
    const b = e.currentTarget;
    try { const { phone } = await api(`/api/listings/${l.id}/phone`); b.outerHTML = `<a class="btn btn-primary btn-block" href="tel:${esc(phone)}">📞 ${esc(phone.replace(/(\d{4})(\d{4})/, '$1-$2'))}</a>`; }
    catch (err) { toast(err.message); }
  });
  $('#share').addEventListener('click', async () => {
    const url = location.href;
    try { if (navigator.share) await navigator.share({ title: l.title, url }); else { await navigator.clipboard.writeText(url); toast('Холбоосыг хууллаа'); } } catch { /* cancelled */ }
  });
  $('#report').addEventListener('click', async () => {
    const reason = prompt('Шалтгаан: 1 — Хуурамч зар, 2 — Давхардсан, 3 — Үнэ буруу, 4 — Зарагдсан, 5 — Бусад', '1');
    if (!reason) return;
    const map = { 1: 'fake', 2: 'duplicate', 3: 'wrong_price', 4: 'sold', 5: 'other' };
    try { await api(`/api/listings/${l.id}/report`, { method: 'POST', body: JSON.stringify({ reason: map[reason.trim()] || 'other' }) }); toast('Баярлалаа! Админ шалгана.'); }
    catch (err) { toast(err.message); }
  });

  const sim = await api(`/api/listings?deal=${l.dealType}&cat=${l.category}&per=9`);
  const items = sim.items.filter((x) => x.id !== l.id)
    .sort((a, b) => (b.location.district === l.location.district) - (a.location.district === l.location.district) || Math.abs(a.price - l.price) - Math.abs(b.price - l.price))
    .slice(0, 4);
  $('#similar').innerHTML = grid(items, 'Төстэй зар алга');
}

async function pageSaved(main) {
  const ids = favs();
  if (!ids.length) { main.innerHTML = '<h1 style="margin-top:20px">Хадгалсан зар</h1><div class="empty">Хадгалсан зар алга. Зарын ♥ товчийг дарж хадгална.</div>'; return; }
  const items = (await Promise.all(ids.map((id) => api(`/api/listings/${id}?noview=1`).catch(() => null)))).filter(Boolean);
  const rows = [
    ['Үнэ', (l) => priceTag(l)], ['м² үнэ', (l) => (l.pricePerM2 ? fmtFull(l.pricePerM2) : '—')], ['Ангилал', (l) => CATS[l.category].name],
    ['Өрөө', (l) => l.rooms ?? '—'], ['Талбай', (l) => (l.area ? l.area + ' м²' : '—')], ['Давхар', (l) => (l.floor ? `${l.floor}/${l.buildingFloors || '?'}` : '—')],
    ['Он', (l) => l.yearInUse ?? '—'], ['Дүүрэг', (l) => esc(l.location.district)], ['Лизинг', (l) => (l.leasing ? 'Тийм' : 'Үгүй')],
    ['360° аялал', (l) => (l.hasTour ? `<a href="#/listing/${l.id}?tour=1">Үзэх</a>` : '—')],
  ];
  main.innerHTML = `<h1 style="margin-top:20px">Хадгалсан зар (${items.length})</h1>${grid(items)}
    ${items.length > 1 ? `<h2>Харьцуулах</h2><div class="compare"><table>
      <tr><th></th>${items.slice(0, 4).map((l) => `<td><a href="#/listing/${l.id}"><b>${esc(l.title)}</b></a></td>`).join('')}</tr>
      ${rows.map(([k, f]) => `<tr><th>${k}</th>${items.slice(0, 4).map((l) => `<td>${f(l)}</td>`).join('')}</tr>`).join('')}
    </table></div>${items.length > 4 ? '<p class="muted small">Эхний 4 зарыг харьцуулж байна.</p>' : ''}` : ''}`;
}

async function pageMy(main) {
  const tokens = store.get('tokens', []);
  const { items } = tokens.length ? await api('/api/mine', { method: 'POST', body: JSON.stringify({ tokens }) }) : { items: [] };
  main.innerHTML = `<div class="section-head" style="margin-top:20px"><h1>Миний зар</h1><a class="btn btn-primary" href="#/post">+ Зар нэмэх</a></div>
    <p class="muted small">Энэ хөтөч дээрээс оруулсан зарууд харагдана. (Жинхэнэ сайтад утасны дугаар + SMS кодоор нэвтэрнэ.)</p>
    ${items.length ? `<table class="admin-table"><tr><th></th><th>Зар</th><th>Төлөв</th><th>Үзсэн</th><th>Дуусах</th><th></th></tr>
      ${items.map((l) => `<tr><td><img src="${esc(l.photos[0] ? l.photos[0].src : NOIMG)}" alt=""></td>
        <td><a href="#/listing/${l.id}">${esc(l.title)}</a><div class="muted small">${priceTag(l)} · ${l.id}</div></td>
        <td><span class="badge ${l.status}">${STATUS_MN[l.status]}</span></td><td>${l.views}</td><td>${fmtDate(l.expiresAt)}</td>
        <td style="white-space:nowrap"><button class="btn btn-sm" data-act="bump" data-id="${l.id}" data-token="${esc(l.token)}">↑ Дээшлүүлэх</button>
          <button class="btn btn-sm" data-act="renew" data-id="${l.id}" data-token="${esc(l.token)}">Сунгах</button>
          <button class="btn btn-sm" data-act="sold" data-id="${l.id}" data-token="${esc(l.token)}">Зарагдсан</button>
          <button class="btn btn-sm btn-danger" data-act="delete" data-id="${l.id}" data-token="${esc(l.token)}">Устгах</button></td></tr>`).join('')}</table>`
      : '<div class="empty">Та одоогоор зар оруулаагүй байна.</div>'}`;
  const onClick = async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'delete' && !confirm('Зарыг бүр мөсөн устгах уу? Буцаах боломжгүй.')) return;
    try {
      await api(`/api/listings/${b.dataset.id}/owner`, { method: 'POST', body: JSON.stringify({ token: b.dataset.token, action: b.dataset.act }) });
      toast({ bump: 'Зар дээшиллээ (демо: төлбөргүй)', renew: '30 хоногоор сунгалаа', sold: 'Зарагдсан гэж тэмдэглэлээ', delete: 'Устгалаа' }[b.dataset.act]);
      router();
    } catch (err) { toast(err.message); }
  };
  main.addEventListener('click', onClick);
  onCleanup(() => main.removeEventListener('click', onClick));
}

async function pageAdmin(main) {
  let key = '';
  try { key = sessionStorage.getItem('adminKey') || ''; } catch { /* ignore */ }
  const login = () => {
    main.innerHTML = `<div class="panel" style="max-width:380px;margin:40px auto"><h1>Админ</h1>
      <form id="adminLogin"><label class="field"><span>Админы түлхүүр</span><input type="password" name="key" autocomplete="off"></label>
      <button class="btn btn-primary">Нэвтрэх</button><p class="muted small">Прототипын үндсэн түлхүүр: <code>admin</code> (ADMIN_KEY орчны хувьсагчаар солино).</p></form></div>`;
    $('#adminLogin').addEventListener('submit', (e) => {
      e.preventDefault(); key = e.target.key.value;
      try { sessionStorage.setItem('adminKey', key); } catch { /* ignore */ }
      render();
    });
  };
  let tab = 'pending';
  async function render() {
    if (!key) return login();
    let data;
    try { data = await api('/api/admin/listings', { headers: { 'x-admin-key': key } }); }
    catch (e) { key = ''; try { sessionStorage.removeItem('adminKey'); } catch { /* ignore */ } toast(e.message); return login(); }
    const groups = {
      pending: data.items.filter((l) => l.status === 'pending'),
      reported: data.items.filter((l) => l.reports > 0),
      active: data.items.filter((l) => l.status === 'active'),
      all: data.items,
    };
    const names = { pending: 'Хянах', reported: 'Мэдээлэгдсэн', active: 'Идэвхтэй', all: 'Бүгд' };
    const list = groups[tab];
    const promoTotal = data.items.filter((l) => l.placement !== 'free').reduce((s, l) => s + PLACEMENTS[l.placement].price, 0);
    main.innerHTML = `<div class="section-head" style="margin-top:20px"><h1>Админ самбар</h1><button class="btn btn-sm" id="logout">Гарах</button></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">
        <div class="panel"><div class="muted small">Нийт зар</div><div class="price">${data.items.length}</div></div>
        <div class="panel"><div class="muted small">Хянах</div><div class="price">${groups.pending.length}</div></div>
        <div class="panel"><div class="muted small">Мэдээлэгдсэн</div><div class="price">${groups.reported.length}</div></div>
        <div class="panel"><div class="muted small">VIP/Онцгой орлого (демо)</div><div class="price">${fmtPrice(promoTotal)}</div></div>
      </div>
      <div class="tabs">${Object.keys(groups).map((k) => `<button class="btn btn-sm ${k === tab ? 'btn-primary' : ''}" data-tab="${k}">${names[k]} (${groups[k].length})</button>`).join('')}</div>
      ${list.length ? `<div style="overflow-x:auto"><table class="admin-table"><tr><th></th><th>Зар</th><th>Оруулагч</th><th>Төлөв</th><th>Мэдээлэл</th><th></th></tr>
      ${list.map((l) => `<tr><td><img src="${esc(l.photos[0] ? l.photos[0].src : NOIMG)}" alt=""></td>
        <td><a href="#/listing/${l.id}" data-preview="${l.id}">${esc(l.title)}</a><div class="muted small">${priceTag(l)} · ${CATS[l.category].name} · ${esc(l.location.district)} · ${l.hasTour ? '360° ✓' : ''}</div></td>
        <td>${esc(l.sellerName)}<div class="muted small">${esc(l.ownerPhone)}</div></td>
        <td><span class="badge ${l.status}">${STATUS_MN[l.status]}</span> ${l.placement !== 'free' ? `<span class="badge ${l.placement}">${l.placement.toUpperCase()}</span>` : ''}</td>
        <td>${l.reports ? `⚑ ${l.reports}<div class="muted small">${data.reports.filter((r) => r.listingId === l.id).map((r) => r.reason).join(', ')}</div>` : ''}</td>
        <td style="white-space:nowrap">
          ${l.status !== 'active' ? `<button class="btn btn-sm btn-primary" data-id="${l.id}" data-status="active">Батлах</button>` : ''}
          ${l.status === 'pending' ? `<button class="btn btn-sm" data-id="${l.id}" data-status="rejected">Татгалзах</button>` : ''}
          ${l.status === 'active' ? `<button class="btn btn-sm" data-id="${l.id}" data-status="pending">Нуух</button>` : ''}
          <button class="btn btn-sm btn-danger" data-id="${l.id}" data-delete="1">Устгах</button></td></tr>`).join('')}</table></div>`
        : '<div class="empty">Энд зар алга.</div>'}`;
    $$('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
    $('#logout').addEventListener('click', () => { key = ''; try { sessionStorage.removeItem('adminKey'); } catch { /* ignore */ } login(); });
    $$('[data-preview]').forEach((a) => a.addEventListener('click', (e) => {
      const l = data.items.find((x) => x.id === a.dataset.preview);
      if (l.status !== 'active') { e.preventDefault(); toast('Идэвхгүй зар нийтэд харагдахгүй. Батласны дараа нээгдэнэ.'); }
    }));
    $$('[data-id]').forEach((b) => b.addEventListener('click', async () => {
      if (b.dataset.delete && !confirm('Зарыг бүр мөсөн устгах уу? Буцаах боломжгүй.')) return;
      try {
        await api(`/api/admin/listings/${b.dataset.id}`, { method: 'POST', headers: { 'x-admin-key': key }, body: JSON.stringify(b.dataset.delete ? { action: 'delete' } : { status: b.dataset.status }) });
        toast('Хадгаллаа'); render();
      } catch (e) { toast(e.message); }
    }));
  }
  render();
}

function captureGuide() {
  return `<div class="guide"><b>📸 360° зураг авах заавар</b><ul>
    <li>Өрөөний голд зогсож, утсаа цээжний өндөрт, <b>хэвтээ</b> барина.</li>
    <li>Бугуйгаа биш, <b>биеэрээ</b> эргэнэ. Утас нэг цэг дээрээ байх ёстой.</li>
    <li><b>Баруун тийш</b> эргэж, зураг бүр өмнөхтэйгээ <b>~1/3-ээр давхцах</b> ёстой (ихэвчлэн 10–14 зураг).</li>
    <li>Бүтэн тойрог эргэж, сүүлийн зураг эхнийхтэйгээ давхцана.</li>
    <li>Бүх гэрлээ асааж, хөшгөө нээнэ. Zoom-ийг өөрчлөхгүй, хүн хөдлөхгүй байх.</li>
    <li>Хоосон цагаан хана руу биш, тавилга, цонх зэрэг зүйл орсон хэсгийг давхцуулбал сайн холбогдоно.</li>
  </ul></div>`;
}

function pageHelp(main) {
  main.innerHTML = `<div class="prose" style="margin:20px 0"><h1>Тусламж</h1>
    <h2>360° аялал хэрхэн хийх вэ?</h2>
    <p>Зар оруулах үед 4-р алхам дээр өрөө бүрт 360° зураг нэмнэ. Хоёр арга бий:</p>
    <ol><li><b>Бэлэн 360° зураг</b> — 360° камер (Insta360, Ricoh Theta) эсвэл утасны панорама аппаар авсан 2:1 харьцаатай зураг.</li>
      <li><b>Энгийн зургуудаас</b> — утсаараа 8–16 давхцсан зураг аваад оруулахад сайт өөрөө нэгтгэж 360° болгоно.</li></ol>
    ${captureGuide()}
    <h2>Өрөөнүүдийг холбох</h2><p>Өрөө бүрийн 360° зураг дээр "Сум нэмэх" товчоор нөгөө өрөө рүү орох сум байрлуулна. Худалдан авагч сумыг дарж өрөөнөөс өрөөнд шилжинэ.</p>
    <h2>AI-аар үүсгэсэн зураг</h2><p>Ирээдүйд нэг зургаас AI-аар 360° зураг үүсгэх боломж нэмэгдэнэ. Ийм зураг дээр үргэлж "AI-аар үүсгэсэн, зөвхөн санаа" гэсэн тэмдэг харагдах бөгөөд жинхэнэ зургийг орлохгүй.</p>
    <h2>Аюулгүй байдал</h2><ul><li>Урьдчилгаа төлбөрийг байраа үзэхээс өмнө бүү шилжүүл.</li><li>Хуурамч, давхардсан зар харвал "Зарыг мэдээлэх" товчийг дарна уу.</li></ul></div>`;
}

function pagePricing(main) {
  main.innerHTML = `<div class="prose" style="margin:20px 0"><h1>Үнэ</h1>
    <table class="admin-table"><tr><th>Үйлчилгээ</th><th>Тайлбар</th><th>Үнэ</th></tr>
    <tr><td>Энгийн зар</td><td>30 хоног</td><td>Үнэгүй</td></tr>
    <tr><td>VIP зар</td><td>Ангилал, хайлтын эхэнд, тодруулсан</td><td>20,000₮ / 7 хоног</td></tr>
    <tr><td>Онцгой зар</td><td>Нүүр хуудсанд харагдана</td><td>40,000₮ / 7 хоног</td></tr>
    <tr><td>Дээшлүүлэх</td><td>"Шинэ зар" жагсаалтын эхэнд гаргана</td><td>3,000₮</td></tr>
    <tr><td>360° аялал</td><td>3 өрөө хүртэл үнэгүй, түүнээс дээш</td><td>10,000₮ / зар</td></tr></table>
    <p class="muted small">Төлбөр: QPay, SocialPay, банкны карт. Энэ прототипт төлбөр жинхэнээр хийгдэхгүй. Үнийг өрсөлдөгчидтэй харьцуулж тогтооно.</p></div>`;
}

/* ---------- post-an-ad wizard ---------- */
const STEP_NAMES = ['Ангилал', 'Мэдээлэл', 'Зураг', '360° аялал', 'Байршил', 'Холбоо барих', 'Нийтлэх'];
function newDraft() {
  return {
    dealType: 'sale', category: 'apartment', title: '', price: '', description: '', garage: false, leasing: false, paymentTerms: ['Бэлэн'],
    photos: [], tour: { startRoomId: null, rooms: [] },
    location: { district: '', khoroo: '', address: '', lat: null, lng: null },
    sellerName: '', sellerPhone: '', sellerType: 'owner', placement: 'free', payMethod: 'qpay',
  };
}
let draft = null;

function pagePost(main) {
  if (!draft) draft = newDraft();
  let step = 0, editRoomId = null, editorViewer = null, pickTarget = null;
  const stepCleanup = [];
  const runStepCleanup = () => { while (stepCleanup.length) { try { stepCleanup.pop()(); } catch { /* ignore */ } } editorViewer = null; };
  onCleanup(runStepCleanup);

  function shell() {
    main.innerHTML = `<div class="wizard"><h1>Зар нэмэх</h1>
      <div class="steps">${STEP_NAMES.map((n, i) => `<button data-step="${i}" class="${i === step ? 'on' : i < step ? 'done' : ''}">${i + 1}. ${n}</button>`).join('')}</div>
      <div class="panel" id="stepBody"></div>
      <div id="stepError"></div>
      <div class="wizard-nav"><button class="btn" id="back" ${step === 0 ? 'disabled' : ''}>‹ Буцах</button>
        ${step < STEP_NAMES.length - 1 ? '<button class="btn btn-primary" id="next">Дараах ›</button>' : '<button class="btn btn-accent" id="publish">Нийтлэх</button>'}</div></div>`;
    $$('[data-step]').forEach((b) => b.addEventListener('click', () => { const t = Number(b.dataset.step); if (t < step || validate(step, true)) go(t > step ? step + 1 : t); }));
    $('#back').addEventListener('click', () => go(step - 1));
    const n = $('#next'); if (n) n.addEventListener('click', () => { if (validate(step)) go(step + 1); });
    const p = $('#publish'); if (p) p.addEventListener('click', publish);
    [stepCategory, stepDetails, stepPhotos, stepTour, stepLocation, stepContact, stepPublish][step]($('#stepBody'));
  }
  function go(s) { runStepCleanup(); step = Math.max(0, Math.min(STEP_NAMES.length - 1, s)); shell(); window.scrollTo(0, 0); }
  function showError(msg) { $('#stepError').innerHTML = msg ? `<div class="error-box" style="margin-top:12px">${esc(msg)}</div>` : ''; }

  function validate(s, silent) {
    const err = (m) => { if (!silent) showError(m); return false; };
    if (s === 1) {
      if (draft.title.trim().length < 5) return err('Гарчиг хамгийн багадаа 5 тэмдэгт байна.');
      if (!(Number(draft.price) > 0)) return err('Үнээ оруулна уу.');
      if (!(Number(draft.area) > 0)) return err('Талбайгаа оруулна уу.');
    }
    if (s === 2 && draft.photos.some((p) => p.uploading)) return err('Зургууд илгээгдэж дуусаагүй байна.');
    if (s === 3 && draft.tour.rooms.some((r) => r.status === 'processing')) return err('360° зураг боловсруулж дуусаагүй байна.');
    if (s === 4) {
      if (!draft.location.district) return err('Дүүргээ сонгоно уу.');
      if (draft.location.lat == null) return err('Газрын зураг дээр дарж байршлаа тэмдэглэнэ үү.');
    }
    if (s === 5) {
      if (!draft.sellerName.trim()) return err('Нэрээ оруулна уу.');
      if (!/^\d{8}$/.test(draft.sellerPhone.replace(/\D/g, ''))) return err('Утасны дугаар 8 оронтой байна.');
    }
    showError('');
    return true;
  }

  function stepCategory(el) {
    el.innerHTML = `<h2 style="margin-top:0">Юу оруулах вэ?</h2>
      <div class="seg" style="margin-bottom:14px"><button data-deal="sale" class="${draft.dealType === 'sale' ? 'on' : ''}">Зарах</button><button data-deal="rent" class="${draft.dealType === 'rent' ? 'on' : ''}">Түрээслэх</button></div>
      <div class="tiles">${Object.entries(CATS).map(([k, c]) => `<button class="tile ${draft.category === k ? 'on' : ''}" data-cat="${k}"><div style="font-size:24px">${c.ico}</div>${c.name}</button>`).join('')}</div>`;
    $$('[data-deal]', el).forEach((b) => b.addEventListener('click', () => { draft.dealType = b.dataset.deal; stepCategory(el); }));
    $$('[data-cat]', el).forEach((b) => b.addEventListener('click', () => { draft.category = b.dataset.cat; stepCategory(el); }));
  }

  function stepDetails(el) {
    const fields = FIELDS_BY_CAT[draft.category];
    const input = (k) => {
      const d = FIELD_DEFS[k], val = esc(draft[k] ?? '');
      if (d.type === 'select') return `<label class="field"><span>${d.label}</span><select data-k="${k}"><option value="">—</option>${d.options.map((o) => `<option ${draft[k] === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
      return `<label class="field"><span>${d.label}${d.req ? ' *' : ''}</span><input type="number" min="0" step="any" data-k="${k}" value="${val}"></label>`;
    };
    el.innerHTML = `<h2 style="margin-top:0">${CATS[draft.category].name} — ${draft.dealType === 'rent' ? 'түрээслүүлнэ' : 'зарна'}</h2>
      <label class="field"><span>Гарчиг *</span><input type="text" data-k="title" maxlength="120" value="${esc(draft.title)}" placeholder="Жишээ нь: Хан-Уул, 3 өрөө, 85м², шинэ байр"></label>
      <label class="field"><span>Үнэ (₮) ${draft.dealType === 'rent' ? '— сарын' : ''} *</span><input type="number" min="0" data-k="price" value="${esc(draft.price)}" placeholder="320000000"></label>
      <div class="muted small" id="pricePreview" style="margin:-8px 0 12px"></div>
      <div class="grid-fields">${fields.map(input).join('')}</div>
      <div style="display:flex;gap:24px;flex-wrap:wrap;margin:6px 0 12px">
        ${draft.category !== 'land' ? `<label class="check"><input type="checkbox" data-k="garage" ${draft.garage ? 'checked' : ''}> Гаражтай</label>` : ''}
        <label class="check"><input type="checkbox" data-k="leasing" ${draft.leasing ? 'checked' : ''}> Лизингээр авах боломжтой</label>
      </div>
      <label class="field"><span>Төлбөрийн нөхцөл</span><div class="chips">${PAY_TERMS.map((p) => `<label class="chip"><input type="checkbox" data-pay="${p}" ${draft.paymentTerms.includes(p) ? 'checked' : ''}>${p}</label>`).join('')}</div></label>
      <label class="field"><span>Дэлгэрэнгүй тайлбар</span><textarea data-k="description" maxlength="5000" placeholder="Байрны онцлог, ойр орчмын үйлчилгээ, засвар...">${esc(draft.description)}</textarea></label>`;
    const preview = () => {
      const p = Number(draft.price), a = Number(draft.area);
      $('#pricePreview', el).textContent = p > 0 ? `${fmtPrice(p)}${a > 0 ? ` · м² — ${fmtFull(p / a)}` : ''}` : '';
    };
    $$('[data-k]', el).forEach((i) => i.addEventListener('input', () => {
      draft[i.dataset.k] = i.type === 'checkbox' ? i.checked : i.value; preview();
    }));
    $$('[data-pay]', el).forEach((i) => i.addEventListener('change', () => {
      draft.paymentTerms = $$('[data-pay]', el).filter((x) => x.checked).map((x) => x.dataset.pay);
    }));
    preview();
  }

  function stepPhotos(el) {
    const render = () => {
      el.innerHTML = `<h2 style="margin-top:0">Зураг <span class="muted small">(${draft.photos.length}/20)</span></h2>
        <label class="dropzone"><input type="file" accept="image/*" multiple id="photoInput">
          <div style="font-size:28px">📷</div><b>Зураг сонгох</b><div class="muted small">Ихдээ 20 зураг. Эхний зураг нүүр зураг болно.</div></label>
        <div class="photo-grid">${draft.photos.map((p, i) => `<div class="ph"><img src="${esc(p.preview || p.src)}" alt="" style="${p.uploading ? 'opacity:.5' : ''}">
          ${i === 0 ? '<span class="badge cover">Нүүр</span>' : `<button class="btn btn-sm cover" data-cover="${i}" style="padding:1px 6px;font-size:11px">Нүүр болгох</button>`}
          <button class="x" data-rm="${i}" aria-label="Устгах">×</button></div>`).join('')}</div>`;
      $('#photoInput', el).addEventListener('change', onFiles);
      $$('[data-rm]', el).forEach((b) => b.addEventListener('click', () => { draft.photos.splice(Number(b.dataset.rm), 1); render(); }));
      $$('[data-cover]', el).forEach((b) => b.addEventListener('click', () => { const [p] = draft.photos.splice(Number(b.dataset.cover), 1); draft.photos.unshift(p); render(); }));
    };
    async function onFiles(e) {
      const files = [...e.target.files].slice(0, 20 - draft.photos.length);
      const entries = files.map((f) => ({ uploading: true, preview: URL.createObjectURL(f), file: f }));
      draft.photos.push(...entries);
      render();
      for (const p of entries) {
        try {
          const r = await resizeImage(p.file, 1600);
          p.src = await upload(r.blob); p.width = r.width; p.height = r.height;
        } catch (err) { toast(err.message); draft.photos.splice(draft.photos.indexOf(p), 1); }
        p.uploading = false; delete p.file;
        if (document.body.contains(el)) render();
      }
    }
    render();
  }

  /* --- step 4: 360° --- */
  function stepTour(el) {
    const rooms = draft.tour.rooms;
    if (!draft.tour.startRoomId && rooms[0]) draft.tour.startRoomId = rooms[0].id;
    el.innerHTML = `<h2 style="margin-top:0">360° аялал <span class="muted small">(заавал биш)</span></h2>
      <p class="muted">Өрөө бүрт 360° зураг нэмээд, өрөөнүүдийг сумаар холбоно. Энгийн утасны зургуудаас сайт өөрөө 360° болгоно.</p>
      <div id="roomList">${rooms.length ? rooms.map(roomCard).join('') : '<div class="muted small" style="margin-bottom:10px">Одоогоор өрөө нэмээгүй байна.</div>'}</div>
      <div id="editor"></div>
      <div class="panel" style="background:var(--surface-2);box-shadow:none" id="addRoom">
        <h3 style="margin-top:0">+ Өрөө нэмэх</h3>
        <div class="row2"><label class="field"><span>Өрөөний нэр</span><input type="text" id="roomName" list="roomNames" placeholder="Зочны өрөө"><datalist id="roomNames">${ROOM_NAMES.map((n) => `<option value="${n}">`).join('')}</datalist></label>
          <label class="field"><span>Арга</span><select id="roomMode"><option value="B">Энгийн зургуудаас холбох (8–16 зураг)</option><option value="A">Бэлэн 360° зураг (2:1)</option></select></label></div>
        <div id="modeBody"></div>
      </div>`;
    $$('[data-edit]', el).forEach((b) => b.addEventListener('click', () => { editRoomId = b.dataset.edit; stepTour(el); }));
    $$('[data-del]', el).forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.del;
      draft.tour.rooms = rooms.filter((r) => r.id !== id);
      draft.tour.rooms.forEach((r) => { r.hotspots = r.hotspots.filter((h) => h.targetRoomId !== id); });
      if (draft.tour.startRoomId === id) draft.tour.startRoomId = draft.tour.rooms[0] ? draft.tour.rooms[0].id : null;
      if (editRoomId === id) editRoomId = null;
      runStepCleanup(); stepTour(el);
    }));
    $$('[data-start]', el).forEach((b) => b.addEventListener('change', () => { draft.tour.startRoomId = b.dataset.start; }));
    $$('[data-retry]', el).forEach((b) => b.addEventListener('click', () => {
      const r = rooms.find((x) => x.id === b.dataset.retry);
      runStitch(r, el);
    }));
    const modeSel = $('#roomMode', el);
    const renderMode = () => {
      const mb = $('#modeBody', el);
      if (modeSel.value === 'A') {
        mb.innerHTML = `<label class="dropzone"><input type="file" accept="image/jpeg,image/png,image/webp" id="panoInput"><div style="font-size:24px">🌐</div><b>360° зураг сонгох</b><div class="muted small">Equirectangular, өргөн = 2 × өндөр (жишээ нь 6000×3000)</div></label>`;
        $('#panoInput', el).addEventListener('change', (e) => addModeA(e.target.files[0], el));
      } else {
        mb.innerHTML = `${captureGuide()}
          <div class="row2" style="margin-top:12px"><label class="field"><span>Камерын линз</span><select id="lens">
            <option value="65">Үндсэн камер (~65°, хэвтээ)</option><option value="50">Үндсэн камер, босоо (~50°)</option><option value="100">Өргөн өнцөг / ultra-wide (~100°)</option></select></label><div></div></div>
          <label class="dropzone"><input type="file" accept="image/*" multiple id="stitchInput"><div style="font-size:24px">🧩</div><b>Давхцсан зургуудаа сонгох</b><div class="muted small">Авсан дарааллаар нь (файлын нэрээр эрэмбэлнэ)</div></label>
          <p class="small"><a href="#" id="demoCapture">Туршилтын 12 зургаар турших</a> <span class="muted">— сайт өөрөө зурсан өрөөний 12 давхцсан зураг</span></p>`;
        $('#stitchInput', el).addEventListener('change', (e) => addModeB([...e.target.files], el));
        $('#demoCapture', el).addEventListener('click', async (e) => {
          e.preventDefault();
          try {
            const files = await Promise.all(Array.from({ length: 12 }, async (_, i) => {
              const name = `IMG_${String(i + 1).padStart(2, '0')}.png`;
              const b = await (await fetch(`/uploads/demo-capture/${name}`)).blob();
              return new File([b], name, { type: 'image/png' });
            }));
            if (!$('#roomName', el).value) $('#roomName', el).value = 'Зочны өрөө (туршилт)';
            addModeB(files, el);
          } catch (err) { toast(err.message); }
        });
      }
    };
    modeSel.addEventListener('change', renderMode);
    renderMode();
    if (editRoomId && rooms.find((r) => r.id === editRoomId && r.status === 'ready')) openEditor(el);
  }

  function roomCard(r) {
    const src = r.panorama ? r.panorama.src : '';
    const label = { upload360: 'Бэлэн 360°', stitched: 'Зургуудаас холбосон', ai: 'AI' }[r.source];
    const st = { ready: 'Бэлэн', processing: 'Боловсруулж байна', failed: 'Амжилтгүй' }[r.status];
    return `<div class="room-card">
      ${src ? `<img src="${esc(src)}" alt="">` : '<div style="width:120px;height:60px;border-radius:6px;background:var(--surface-2)"></div>'}
      <div class="grow"><b>${esc(r.name)}</b> <span class="status ${r.status}">${st}</span>
        <div class="muted small">${label}${r.photoCount ? ` · ${r.photoCount} зураг` : ''}${r.hotspots.length ? ` · ${r.hotspots.length} сум` : ''}</div>
        ${r.status === 'processing' ? `<div class="progress"><div id="prog-${r.id}" style="width:${Math.round((r.progress || 0) * 100)}%"></div></div><div class="muted small" id="progText-${r.id}">${esc(r.progressText || '')}</div>` : ''}
        ${r.status === 'failed' ? `<div class="error-box" style="margin-top:6px">${esc(r.error)}\n\nДахин зураг авах, эсвэл "Бэлэн 360° зураг" аргыг ашиглах, эсвэл энгийн зургийн цомгоор үлдээж болно.</div>` : ''}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        ${r.status === 'ready' ? `<label class="check small"><input type="radio" name="startRoom" data-start="${r.id}" ${draft.tour.startRoomId === r.id ? 'checked' : ''}> Эхлэх өрөө</label>
          <button class="btn btn-sm ${editRoomId === r.id ? 'btn-primary' : ''}" data-edit="${r.id}">Засах / сум нэмэх</button>` : ''}
        ${r.status === 'failed' && r.files ? `<button class="btn btn-sm" data-retry="${r.id}">Дахин оролдох</button>` : ''}
        <button class="btn btn-sm btn-danger" data-del="${r.id}">Устгах</button></div></div>`;
  }

  const newRoomId = () => 'r' + Math.random().toString(36).slice(2, 8);
  function takeRoomName(el) {
    const i = $('#roomName', el); const n = i.value.trim() || `Өрөө ${draft.tour.rooms.length + 1}`; i.value = ''; return n;
  }

  async function addModeA(file, el) {
    if (!file) return;
    try {
      const r = await resizeImage(file, 6000);
      const ratio = r.origW / r.origH;
      if (ratio < 1.95 || ratio > 2.05) {
        toast(`Энэ зураг 360° (2:1) биш байна: ${r.origW}×${r.origH}. "Энгийн зургуудаас холбох" аргыг ашиглана уу.`);
        return;
      }
      const room = { id: newRoomId(), name: takeRoomName(el), source: 'upload360', status: 'processing', progress: 0.5, progressText: 'Илгээж байна', hotspots: [], startYaw: 0 };
      draft.tour.rooms.push(room); stepTour(el);
      room.panorama = { src: await upload(r.blob), width: r.width, height: r.height };
      room.status = 'ready';
      editRoomId = room.id;
    } catch (err) { toast(err.message); }
    if (document.body.contains(el)) { runStepCleanup(); stepTour(el); }
  }

  function addModeB(files, el) {
    if (!files.length) return;
    const room = { id: newRoomId(), name: takeRoomName(el), source: 'stitched', status: 'processing', hotspots: [], startYaw: 0, files, photoCount: files.length, fov: Number(($('#lens', el) || {}).value) || 65 };
    draft.tour.rooms.push(room);
    runStitch(room, el);
  }

  async function runStitch(room, el) {
    room.status = 'processing'; room.progress = 0; room.progressText = 'Эхэлж байна'; room.error = null;
    runStepCleanup(); stepTour(el);
    try {
      const res = await Stitcher.stitch(room.files, {
        fov: room.fov,
        onProgress: (p, t) => {
          room.progress = p; room.progressText = t;
          const bar = document.getElementById(`prog-${room.id}`), txt = document.getElementById(`progText-${room.id}`);
          if (bar) bar.style.width = Math.round(p * 100) + '%';
          if (txt) txt.textContent = t;
        },
      });
      room.progressText = 'Илгээж байна';
      const blob = await canvasToBlob(res.canvas, 'image/jpeg', 0.9);
      room.panorama = { src: await upload(blob), width: res.width, height: res.height };
      room.status = 'ready';
      delete room.files; // originals are not kept after stitching
      editRoomId = room.id;
      toast(`360° бэлэн боллоо (${res.photos} зураг, линз ≈ ${Math.round(res.lensDeg)}°)`);
    } catch (err) {
      room.status = 'failed';
      room.error = err.message || String(err);
    }
    if (document.body.contains(el)) { runStepCleanup(); stepTour(el); }
  }

  function openEditor(el) {
    const room = draft.tour.rooms.find((r) => r.id === editRoomId);
    const others = draft.tour.rooms.filter((r) => r.id !== room.id && r.status === 'ready');
    const ed = $('#editor', el);
    ed.innerHTML = `<div class="editor"><b>${esc(room.name)}</b> — чирж эргүүлж үзнэ үү
      <div class="pano" id="edPano" style="margin-top:8px"></div>
      <div class="editor-tools">
        <button class="btn btn-sm" id="setStart">🧭 Одоогийн чиглэлийг эхлэл болгох</button>
        ${others.length ? `<select id="hsTarget">${others.map((o) => `<option value="${o.id}">→ ${esc(o.name)}</option>`).join('')}</select>
          <button class="btn btn-sm btn-primary" id="addHs">➕ Сум нэмэх</button>` : '<span class="muted small">Сум нэмэхийн тулд өөр өрөө нэмнэ үү.</span>'}
        <button class="btn btn-sm" id="closeEd" style="margin-left:auto">Хаах</button>
      </div>
      <div class="muted small" id="edHint"></div>
      <ul class="hs-list">${room.hotspots.map((h, i) => `<li>→ ${esc(h.label)} <span class="muted small">(yaw ${Math.round(h.yaw)}°, pitch ${Math.round(h.pitch)}°)</span> <button class="btn btn-sm btn-danger" data-rmhs="${i}">Устгах</button></li>`).join('')}</ul></div>`;
    const v = pannellum.viewer('edPano', {
      type: 'equirectangular', panorama: room.panorama.src, autoLoad: true, yaw: room.startYaw || 0, hfov: 100, compass: false,
      hotSpots: room.hotspots.map((h) => ({ pitch: h.pitch, yaw: h.yaw, type: 'info', text: '→ ' + h.label })),
    });
    editorViewer = v;
    stepCleanup.push(() => { try { v.destroy(); } catch { /* ignore */ } });
    $('#setStart', ed).addEventListener('click', () => { room.startYaw = Math.round(v.getYaw()); toast(`Эхлэх чиглэл: ${room.startYaw}°`); });
    $('#closeEd', ed).addEventListener('click', () => { editRoomId = null; runStepCleanup(); stepTour(el); });
    const pano = $('#edPano', ed);
    if (others.length) {
      $('#addHs', ed).addEventListener('click', () => {
        pickTarget = $('#hsTarget', ed).value;
        pano.classList.add('picking');
        $('#edHint', ed).textContent = 'Зураг дээр хаалга эсвэл гарц руу дарж сумыг байрлуулна уу.';
      });
    }
    let down = null;
    const md = (e) => { down = [e.clientX, e.clientY]; };
    const mu = (e) => {
      if (!pickTarget || !down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
      const [pitch, yaw] = v.mouseEventToCoords(e);
      const target = draft.tour.rooms.find((r) => r.id === pickTarget);
      room.hotspots.push({ pitch, yaw, targetRoomId: target.id, label: target.name });
      pickTarget = null;
      runStepCleanup(); stepTour(el);
    };
    pano.addEventListener('pointerdown', md, true);
    pano.addEventListener('pointerup', mu, true);
    $$('[data-rmhs]', ed).forEach((b) => b.addEventListener('click', () => { room.hotspots.splice(Number(b.dataset.rmhs), 1); runStepCleanup(); stepTour(el); }));
  }

  function stepLocation(el) {
    el.innerHTML = `<h2 style="margin-top:0">Байршил</h2>
      <div class="grid-fields">
        <label class="field"><span>Хот / аймаг</span><input type="text" value="Улаанбаатар" disabled></label>
        <label class="field"><span>Дүүрэг *</span><select id="district"><option value="">—</option>${DISTRICTS.map((d) => `<option ${draft.location.district === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
        <label class="field"><span>Хороо</span><input type="text" id="khoroo" value="${esc(draft.location.khoroo)}" placeholder="11-р хороо"></label>
      </div>
      <label class="field"><span>Хаяг, байрны нэр</span><input type="text" id="address" value="${esc(draft.location.address)}" placeholder="Жишээ нь: River Garden, 305-р байр"></label>
      <p class="muted small">Газрын зураг дээр дарж байршлаа тэмдэглэнэ үү. Нийтэд ойролцоо тойргоор харагдана.</p>
      <div class="mini-map" id="locMap" style="height:360px"></div>`;
    const start = draft.location.lat != null ? [draft.location.lat, draft.location.lng] : CENTERS[draft.location.district] || UB;
    const m = L.map('locMap').setView(start, draft.location.lat != null ? 15 : 12);
    tileLayer().addTo(m);
    stepCleanup.push(() => m.remove());
    let marker = draft.location.lat != null ? L.marker(start, { icon: L.divIcon({ className: '', html: '<span class="map-pin">📍</span>' }) }).addTo(m) : null;
    m.on('click', (e) => {
      draft.location.lat = +e.latlng.lat.toFixed(6); draft.location.lng = +e.latlng.lng.toFixed(6);
      if (marker) marker.setLatLng(e.latlng); else marker = L.marker(e.latlng, { icon: L.divIcon({ className: '', html: '<span class="map-pin">📍</span>' }) }).addTo(m);
    });
    $('#district', el).addEventListener('change', (e) => { draft.location.district = e.target.value; if (CENTERS[e.target.value]) m.setView(CENTERS[e.target.value], 14); });
    $('#khoroo', el).addEventListener('input', (e) => { draft.location.khoroo = e.target.value; });
    $('#address', el).addEventListener('input', (e) => { draft.location.address = e.target.value; });
  }

  function previewListing() {
    return {
      id: 'preview', title: draft.title || '(гарчиггүй)', price: Number(draft.price) || 0, dealType: draft.dealType, category: draft.category,
      rooms: Number(draft.rooms) || null, area: Number(draft.area) || null, floor: Number(draft.floor) || null, buildingFloors: Number(draft.buildingFloors) || null,
      photos: draft.photos.filter((p) => p.src), location: { district: draft.location.district || '—' }, createdAt: new Date().toISOString(),
      tour: { rooms: draft.tour.rooms }, hasTour: draft.tour.rooms.some((r) => r.status === 'ready'), promo: draft.placement === 'top' ? 2 : draft.placement === 'vip' ? 1 : 0,
    };
  }

  function stepContact(el) {
    el.innerHTML = `<h2 style="margin-top:0">Холбоо барих ба урьдчилан харах</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px">
        <div>
          <label class="field"><span>Нэр *</span><input type="text" id="sName" value="${esc(draft.sellerName)}" maxlength="60"></label>
          <label class="field"><span>Утасны дугаар *</span><input type="tel" id="sPhone" value="${esc(draft.sellerPhone)}" placeholder="8 оронтой" maxlength="11"></label>
          <label class="field"><span>Зар оруулагч</span><select id="sType"><option value="owner" ${draft.sellerType === 'owner' ? 'selected' : ''}>Эзэмшигч</option><option value="agent" ${draft.sellerType === 'agent' ? 'selected' : ''}>Агент</option></select></label>
          <p class="muted small">Утасны дугаар зар дээр шууд харагдахгүй — "Утасны дугаар харах" товч дарсан хүнд л харагдана. Жинхэнэ сайтад SMS кодоор баталгаажуулна.</p>
        </div>
        <div><div class="muted small" style="margin-bottom:6px">Карт ингэж харагдана:</div><div style="max-width:300px">${card(previewListing())}</div></div>
      </div>`;
    $('#sName', el).addEventListener('input', (e) => { draft.sellerName = e.target.value; });
    $('#sPhone', el).addEventListener('input', (e) => { draft.sellerPhone = e.target.value; });
    $('#sType', el).addEventListener('change', (e) => { draft.sellerType = e.target.value; });
    $$('a.card', el).forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));
  }

  function stepPublish(el) {
    const ready = draft.tour.rooms.filter((r) => r.status === 'ready').length;
    const tourFee = ready > 3 ? 10000 : 0;
    const total = PLACEMENTS[draft.placement].price + tourFee;
    el.innerHTML = `<h2 style="margin-top:0">Нийтлэх</h2>
      <div class="placements">${Object.entries(PLACEMENTS).map(([k, p]) => `<button class="tile ${draft.placement === k ? 'on' : ''}" data-pl="${k}"><b>${p.name}</b>${p.price ? fmtFull(p.price) : 'Үнэгүй'}<div class="muted small">${p.note}</div></button>`).join('')}</div>
      <p>Зураг: <b>${draft.photos.filter((p) => p.src).length}</b> · 360° өрөө: <b>${ready}</b>${tourFee ? ` (3-аас олон өрөө: +${fmtFull(tourFee)})` : ''}</p>
      ${total ? `<h3>Төлбөрийн арга</h3><div class="chips">${[['qpay', 'QPay'], ['socialpay', 'SocialPay'], ['card', 'Банкны карт']].map(([k, n]) => `<label class="chip ${draft.payMethod === k ? 'on' : ''}"><input type="radio" name="pay" value="${k}" ${draft.payMethod === k ? 'checked' : ''}>${n}</label>`).join('')}</div>
        <p class="ok-box" style="margin-top:10px">Нийт: <b>${fmtFull(total)}</b>. Энэ бол прототип — төлбөр жинхэнээр хийгдэхгүй, VIP/Онцгой шууд идэвхжинэ.</p>` : ''}
      <p class="muted small">Нийтэлсний дараа админ шалгаж баталсны дараа зар харагдана.</p>`;
    $$('[data-pl]', el).forEach((b) => b.addEventListener('click', () => { draft.placement = b.dataset.pl; stepPublish(el); }));
    $$('input[name=pay]', el).forEach((i) => i.addEventListener('change', () => { draft.payMethod = i.value; stepPublish(el); }));
  }

  async function publish() {
    for (let s = 1; s <= 5; s++) if (!validate(s)) { go(s); validate(s); return; }
    const btn = $('#publish'); btn.disabled = true; btn.textContent = 'Илгээж байна…';
    const body = {
      ...draft,
      photos: draft.photos.filter((p) => p.src).map(({ src, width, height }) => ({ src, width, height })),
      tour: {
        startRoomId: draft.tour.startRoomId,
        rooms: draft.tour.rooms.filter((r) => r.status === 'ready').map((r) => ({ id: r.id, name: r.name, source: r.source, panorama: r.panorama, startYaw: r.startYaw, hotspots: r.hotspots })),
      },
    };
    try {
      const res = await api('/api/listings', { method: 'POST', body: JSON.stringify(body) });
      store.set('tokens', [...store.get('tokens', []), res.token]);
      draft = null;
      main.innerHTML = `<div class="panel" style="max-width:560px;margin:40px auto;text-align:center">
        <div style="font-size:44px">✅</div><h1>Зар илгээгдлээ</h1>
        <p>Зарын дугаар: <b>${esc(res.id)}</b>. Админ шалгаж баталсны дараа нийтэд харагдана.</p>
        <p><a class="btn btn-primary" href="#/my">Миний зар</a> <a class="btn" href="#/admin">Админ самбар (демо)</a></p></div>`;
    } catch (err) { showError(err.message); btn.disabled = false; btn.textContent = 'Нийтлэх'; }
  }

  shell();
}

/* ---------- nav dropdowns (property types) ---------- */
function closeMenus(except) {
  $$('#nav .dd').forEach((d) => { if (d !== except) { d.classList.remove('open'); $('.caret', d).setAttribute('aria-expanded', 'false'); } });
}
function buildMenus(counts) {
  $$('#nav .menu').forEach((m) => {
    const deal = m.dataset.deal;
    m.innerHTML = Object.entries(CATS).map(([k, v]) =>
      `<a href="#/search?deal=${deal}&cat=${k}" data-deal="${deal}" data-cat="${k}"><span class="ico">${v.ico}</span><span>${v.name}</span><span class="n">${counts ? counts[`${deal}:${k}`] || 0 : ''}</span></a>`).join('');
  });
}
// highlight the type currently being browsed (e.g. Зарах › Орон сууц)
function markMenus() {
  const { path, query } = parseHash();
  $$('#nav .menu a').forEach((a) => a.classList.toggle('on', path === '/search' &&
    a.dataset.deal === query.get('deal') && a.dataset.cat === query.get('cat')));
}
buildMenus(); // names first, counts fill in once /api/stats answers
api('/api/stats').then((s) => { buildMenus(s.counts); markMenus(); }).catch(() => { /* counts are optional */ });
$$('#nav .caret').forEach((b) => b.addEventListener('click', (e) => {
  e.stopPropagation();
  const dd = b.closest('.dd'), open = !dd.classList.contains('open');
  closeMenus(dd);
  dd.classList.toggle('open', open);
  b.setAttribute('aria-expanded', String(open));
}));
document.addEventListener('click', (e) => { if (!e.target.closest('#nav .dd')) closeMenus(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });

/* ---------- tab ink: a brass marker that slides to the active tab ----------
   One helper for every tab-like control (nav, Жагсаалт/Газрын зураг, Зураг/360°). It watches class changes,
   so the existing click handlers don't need to know about it. Active = a direct child with .on or .btn-primary. */
const INK_BOXES = '#nav, .seg, .media-tabs';
function placeInks() {
  for (const box of $$(INK_BOXES)) {
    let ink = $(':scope > .ink', box);
    if (!ink) { ink = document.createElement('span'); ink.className = 'ink'; ink.setAttribute('aria-hidden', 'true'); box.prepend(ink); box.classList.add('has-ink'); }
    const on = $(':scope > .on, :scope > .btn-primary', box);
    if (!on || !on.offsetWidth) { ink.style.opacity = '0'; continue; }
    ink.style.opacity = '1';
    ink.style.width = on.offsetWidth + 'px';
    ink.style.transform = `translateX(${on.offsetLeft}px)`;
    // first placement jumps into position; later ones slide (the transition is keyed off data-ready)
    if (!ink.dataset.ready) setTimeout(() => { ink.dataset.ready = '1'; }, 50);
  }
}
// Batched with setTimeout, not requestAnimationFrame: rAF stalls in background/hidden tabs, which left the ink unplaced
let inkQueued = false;
const queueInks = () => { if (!inkQueued) { inkQueued = true; setTimeout(() => { inkQueued = false; placeInks(); }, 0); } };
// ponytail: watches the whole body; cheap (≤3 boxes, batched per frame). Scope it to #app + #nav if the page grows heavy.
new MutationObserver(queueInks).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
window.addEventListener('resize', queueInks);
document.fonts?.ready.then(queueInks); // widths change once the web fonts arrive

/* ---------- boot ---------- */
// --vw: viewport width WITHOUT the scrollbar (100vw includes it on desktop), for the full-bleed hero
const setVw = () => document.documentElement.style.setProperty('--vw', document.documentElement.clientWidth + 'px');
// ResizeObserver, not 'resize': the scrollbar appears once listings load, which changes the width without a resize event
setVw();
new ResizeObserver(setVw).observe(document.documentElement);
updateFavCount();
router();
