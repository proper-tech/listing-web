'use client';
/* Styled dropdown for every <select> on the site (styles: .sm-* in app/proper.css).
 *
 * The OS draws a <select>'s option list itself (the grey macOS menu with a blue highlight), and CSS can't reach it.
 * This one component, mounted once in layout.tsx, takes over the list for ALL selects through document-level events:
 *   - the real <select> stays in place: same name/form value, same onChange, same field styles. Only its popup is replaced;
 *   - picking an option sets selectedIndex and fires the native input + change events, so React onChange and form handlers run as usual;
 *   - focus stays on the <select> while the list is open (keys are handled here, aria-activedescendant points into the list).
 * Touch input keeps the phone's native picker, which is better there. Opt out per element with data-native. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Item = { index: number; label: string; disabled: boolean; group?: string };
type Open = { sel: HTMLSelectElement; items: Item[]; dark: boolean; radius: number; font: number };

const GAP = 6, EDGE = 8, MAX_H = 320, ROW = 38;
const LIST_ID = 'sm-list';
const optId = (i: number) => `sm-opt-${i}`;

function eligible(el: EventTarget | null): HTMLSelectElement | null {
  const sel = el instanceof Element ? el.closest('select') : null;
  if (!sel || sel.disabled || sel.multiple || sel.size > 1 || sel.hasAttribute('data-native')) return null;
  return sel;
}

function readItems(sel: HTMLSelectElement): Item[] {
  return Array.from(sel.options).flatMap((o, index) => {
    if (o.hidden) return [];
    const g = o.parentElement instanceof HTMLOptGroupElement ? o.parentElement : null;
    return [{ index, label: o.label || o.text, disabled: o.disabled || !!g?.disabled, group: g?.label }];
  });
}

/* light text on the field = dark field (the video hero) → dark list */
function isDark(sel: HTMLSelectElement) {
  const m = getComputedStyle(sel).color.match(/\d+(\.\d+)?/g);
  if (!m) return false;
  const [r, g, b] = m.map(Number);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

export default function SelectMenu() {
  const [open, setOpen] = useState<Open | null>(null);
  const [active, setActive] = useState(-1);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const openRef = useRef<Open | null>(null);
  const activeRef = useRef(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const touch = useRef(false);
  const typed = useRef({ buf: '', t: 0 });
  openRef.current = open;
  activeRef.current = active;

  const close = useCallback((refocus: boolean) => {
    const o = openRef.current;
    if (!o) return;
    o.sel.removeAttribute('aria-expanded');
    o.sel.removeAttribute('aria-controls');
    o.sel.removeAttribute('aria-activedescendant');
    o.sel.classList.remove('sm-open');
    if (refocus) o.sel.focus({ preventScroll: true });
    openRef.current = null;
    setOpen(null);
  }, []);

  const show = useCallback((sel: HTMLSelectElement) => {
    const items = readItems(sel);
    if (!items.length) return;
    const cs = getComputedStyle(sel);
    const radius = parseFloat(cs.borderTopLeftRadius) || 0;
    sel.setAttribute('aria-expanded', 'true');
    sel.setAttribute('aria-controls', LIST_ID);
    sel.classList.add('sm-open');
    const o: Open = { sel, items, dark: isDark(sel), radius, font: Math.min(16, Math.max(14, parseFloat(cs.fontSize) || 15)) };
    openRef.current = o;
    setRect(sel.getBoundingClientRect());
    setActive(sel.selectedIndex >= 0 ? sel.selectedIndex : items.find((i) => !i.disabled)?.index ?? -1);
    setOpen(o);
  }, []);

  const pick = useCallback((index: number) => {
    const o = openRef.current;
    if (!o) return;
    const it = o.items.find((i) => i.index === index);
    if (!it || it.disabled) return;
    const sel = o.sel;
    close(true);
    if (sel.selectedIndex === index) return;
    sel.selectedIndex = index;
    sel.dispatchEvent(new Event('input', { bubbles: true }));
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, [close]);

  /* next enabled item from the active one, by step; clamps at the ends like a native list */
  const move = useCallback((step: number, from?: number) => {
    const o = openRef.current;
    if (!o) return;
    const en = o.items.filter((i) => !i.disabled);
    if (!en.length) return;
    let pos = en.findIndex((i) => i.index === (from ?? activeRef.current));
    pos = pos < 0 ? (step > 0 ? -1 : en.length) : pos;
    setActive(en[Math.max(0, Math.min(en.length - 1, pos + step))].index);
  }, []);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => { touch.current = e.pointerType === 'touch' || e.pointerType === 'pen'; };

    const onMouseDown = (e: MouseEvent) => {
      const o = openRef.current;
      if (o && listRef.current?.contains(e.target as Node)) { e.preventDefault(); return; } // keep focus on the <select>
      const sel = eligible(e.target);
      if (o) {
        close(false);
        if (sel === o.sel) { e.preventDefault(); return; } // second click on the field closes it
      }
      if (!sel || e.button !== 0 || touch.current) return;
      e.preventDefault(); // stops the OS menu
      sel.focus({ preventScroll: true });
      show(sel);
    };

    const onKey = (e: KeyboardEvent) => {
      const o = openRef.current;
      if (!o) {
        const sel = eligible(e.target);
        if (!sel || e.ctrlKey || e.metaKey) return;
        if (['ArrowDown', 'ArrowUp', 'Enter', ' ', 'F4'].includes(e.key)) { e.preventDefault(); show(sel); }
        return;
      }
      if (e.target !== o.sel) return;
      const page = Math.max(1, Math.floor((listRef.current?.clientHeight ?? MAX_H) / ROW) - 1);
      const en = o.items.filter((i) => !i.disabled);
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); if (e.altKey) pick(activeRef.current); else move(1); return;
        case 'ArrowUp': e.preventDefault(); if (e.altKey) pick(activeRef.current); else move(-1); return;
        case 'PageDown': e.preventDefault(); move(page); return;
        case 'PageUp': e.preventDefault(); move(-page); return;
        case 'Home': e.preventDefault(); if (en.length) setActive(en[0].index); return;
        case 'End': e.preventDefault(); if (en.length) setActive(en[en.length - 1].index); return;
        case 'Enter': e.preventDefault(); pick(activeRef.current); return;
        case 'Escape': e.preventDefault(); e.stopPropagation(); close(true); return;
        case 'Tab': close(false); return;
      }
      // type-ahead: letters jump to the first matching option (a lone repeated letter cycles through matches)
      if ((e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) && !(e.key === ' ' && !typed.current.buf)) {
        e.preventDefault();
        const now = Date.now();
        const t = typed.current;
        t.buf = (now - t.t > 700 ? '' : t.buf) + e.key.toLocaleLowerCase('mn');
        t.t = now;
        const cycle = t.buf.length > 1 && [...t.buf].every((c) => c === t.buf[0]);
        const q = cycle ? t.buf[0] : t.buf;
        const start = en.findIndex((i) => i.index === activeRef.current);
        const order = [...en.slice(start + (q.length === 1 ? 1 : 0)), ...en.slice(0, start + (q.length === 1 ? 1 : 0))];
        const hit = order.find((i) => i.label.trim().toLocaleLowerCase('mn').startsWith(q));
        if (hit) setActive(hit.index);
      } else if (e.key === ' ') { e.preventDefault(); pick(activeRef.current); }
    };

    const onBlur = () => close(false);
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('blur', onBlur);
    };
  }, [show, close, pick, move]);

  /* follow the field while open (page scroll, panel scroll, layout shifts); close if it disappears */
  useEffect(() => {
    if (!open) return;
    let raf = 0, last = '';
    const tick = () => {
      const r = open.sel.getBoundingClientRect();
      if (!open.sel.isConnected || (r.width === 0 && r.height === 0) || r.bottom < 0 || r.top > window.innerHeight) { close(false); return; }
      const k = `${r.left}|${r.top}|${r.width}|${r.height}|${window.innerWidth}|${window.innerHeight}`;
      if (k !== last) { last = k; setRect(r); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, close]);

  useEffect(() => {
    if (open && active >= 0) {
      open.sel.setAttribute('aria-activedescendant', optId(active));
      document.getElementById(optId(active))?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, active]);

  /* keep the list inside the viewport horizontally once its real width is known */
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el || !rect) return;
    const w = el.offsetWidth;
    el.style.left = `${Math.max(EDGE, Math.min(rect.left, window.innerWidth - EDGE - w))}px`;
  }, [rect, open]);

  if (!open || !rect) return null;

  const vh = window.innerHeight;
  const below = vh - rect.bottom - GAP - EDGE, above = rect.top - GAP - EDGE;
  const want = Math.min(MAX_H, open.items.length * ROW + 12);
  const up = below < want && above > below;
  const maxH = Math.max(120, Math.min(MAX_H, up ? above : below));
  const r = open.radius >= 6 ? Math.min(14, open.radius + 2) : 4;
  const sel = open.sel.selectedIndex;

  return createPortal(
    <div ref={listRef} id={LIST_ID} role="listbox" aria-label={open.sel.getAttribute('aria-label') || undefined}
      className={`sm-list${open.dark ? ' sm-dark' : ''}${up ? ' sm-up' : ''}`}
      style={{
        top: up ? undefined : rect.bottom + GAP, bottom: up ? vh - rect.top + GAP : undefined, left: rect.left,
        minWidth: rect.width, maxHeight: maxH, borderRadius: r, fontSize: open.font, ['--sm-r' as string]: `${Math.max(2, r - 4)}px`,
      }}>
      {open.items.map((it, n) => (
        <div key={it.index}>
          {it.group && it.group !== open.items[n - 1]?.group && <div className="sm-group" role="presentation">{it.group}</div>}
          <div id={optId(it.index)} role="option" aria-selected={it.index === sel} aria-disabled={it.disabled || undefined}
            className={`sm-opt${it.index === active ? ' is-active' : ''}${it.index === sel ? ' is-sel' : ''}`}
            onMouseMove={() => { if (!it.disabled && activeRef.current !== it.index) setActive(it.index); }}
            onClick={() => pick(it.index)}>
            <span className="sm-label">{it.label}</span>
            <svg className="sm-check" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" /></svg>
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}
