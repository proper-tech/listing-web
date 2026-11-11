'use client';
import { useEffect, useRef } from 'react';

/* Seamless, never-ending hero background.
   The clip is a moving drone shot, so the native `loop` attribute snaps back to frame 0 with a visible jump.
   Instead two copies of the same clip are stacked: shortly before the visible one ends, the hidden one restarts
   from 0 and fades in ON TOP of it (the old one stays fully opaque underneath, so there is no brightness dip).
   Then the roles swap, forever. `loop` stays on both as a safety net (e.g. a background tab where rAF is paused).
   Also: pauses while the hero is off-screen, resumes when the tab comes back, retries after the first tap if
   autoplay was blocked (iOS low-power mode), and shows a still frame for prefers-reduced-motion. */
const FADE = 0.8; // seconds of crossfade: short, so the end and start shots never sit visibly on top of each other
const LEAD = 0.3; // start the fade this much earlier than strictly needed, so the outgoing clip never hits its end

export default function HeroVideo({ src }: { src: string }) {
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const a = aRef.current, b = bRef.current;
    if (!a || !b) return;
    const vids = [a, b];
    vids.forEach((v) => { v.muted = true; v.defaultMuted = true; }); // React doesn't reliably set the muted property
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // first frame only

    let active = 0;
    let fading = false;
    let visible = true;
    let raf = 0;
    let swapTimer: ReturnType<typeof setTimeout> | undefined;

    const unlock = () => { if (visible) vids[active].play().catch(() => {}); };
    const play = (v: HTMLVideoElement) => v.play().catch(() => {
      // autoplay refused: try again on the first interaction
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
    });

    const tick = () => {
      const cur = vids[active], next = vids[1 - active];
      const d = cur.duration;
      // the standby copy only loads metadata at first (the clip is large); start buffering it ~10s before it's needed
      if (next.preload !== 'auto' && d && cur.currentTime >= d - 10) next.preload = 'auto';
      if (!fading && visible && d > FADE * 2 && cur.currentTime >= d - FADE - LEAD) {
        fading = true;
        next.currentTime = 0;
        play(next);
        next.style.zIndex = '-2';
        cur.style.zIndex = '-3';
        next.style.transition = `opacity ${FADE}s ease-in-out`;
        next.style.opacity = '1';
        swapTimer = setTimeout(() => {
          cur.style.transition = 'none';
          cur.style.opacity = '0';
          cur.pause();
          cur.currentTime = 0; // parked at the start, ready for the next swap
          active = 1 - active;
          fading = false;
        }, FADE * 1000 + 50);
      }
      raf = requestAnimationFrame(tick);
    };

    play(a);
    raf = requestAnimationFrame(tick);

    // pause when the hero is scrolled away: saves battery and decoder time
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) { play(vids[active]); if (fading) play(vids[1 - active]); }
      else vids.forEach((v) => v.pause());
    });
    io.observe(a.parentElement ?? a);

    const onVis = () => { if (document.visibilityState === 'visible' && visible) play(vids[active]); };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(swapTimer);
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      vids.forEach((v) => v.pause());
    };
  }, []);

  return (
    <div className="hero-media" aria-hidden="true">
      <video ref={aRef} className="hero-video" src={src} muted loop playsInline preload="auto" />
      <video ref={bRef} className="hero-video" src={src} muted loop playsInline preload="metadata" data-standby="" />
    </div>
  );
}
