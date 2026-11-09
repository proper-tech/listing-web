export class StitchError extends Error {
  pairs: unknown[];
}

export interface StitchOptions {
  /** horizontal field of view of the phone lens, degrees */
  fov?: number;
  /** working height in px (lower = faster) */
  workH?: number;
  /** max width of the output equirectangular image */
  maxOut?: number;
  onProgress?: (fraction: number, text: string) => void;
}

export interface StitchResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  photos: number;
  lensDeg: number;
  reversed: boolean;
  scores: number[];
}

export function stitch(files: File[], opts?: StitchOptions): Promise<StitchResult>;
