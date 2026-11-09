'use client';
import { PANNELLUM_JS } from './constants';
import { loadScript } from './images';

// Minimal typing for the parts of Pannellum we use.
export interface PannellumViewer {
  destroy(): void;
  getYaw(): number;
  loadScene(id: string): void;
  on(event: 'scenechange', cb: (id: string) => void): void;
  mouseEventToCoords(e: MouseEvent): [number, number];
}
interface PannellumLib { viewer(el: HTMLElement, config: Record<string, unknown>): PannellumViewer }

export async function getPannellum(): Promise<PannellumLib> {
  await loadScript(PANNELLUM_JS);
  return (window as unknown as { pannellum: PannellumLib }).pannellum;
}
