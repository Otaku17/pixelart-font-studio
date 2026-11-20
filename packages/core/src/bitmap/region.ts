import { getPixel, setPixel } from './draw';

// Rectangular selection helpers.

export interface Region {
  bitmap: Uint8Array;
  w: number;
  h: number;
}

/** Extracts the rectangular region [x0..x1] x [y0..y1] (inclusive, unordered corners) from src. */
export function extractRegion(
  src: Uint8Array,
  w: number,
  h: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Region {
  const left = Math.max(0, Math.min(x0, x1));
  const right = Math.min(w - 1, Math.max(x0, x1));
  const top = Math.max(0, Math.min(y0, y1));
  const bottom = Math.min(h - 1, Math.max(y0, y1));
  const rw = Math.max(1, right - left + 1);
  const rh = Math.max(1, bottom - top + 1);
  const bitmap = new Uint8Array(rw * rh);
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      bitmap[y * rw + x] = getPixel(src, left + x, top + y, w, h);
    }
  }
  return { bitmap, w: rw, h: rh };
}

/** Clears (sets to 0) the rectangular region [x0..x1] x [y0..y1] (inclusive, unordered corners) in place. */
export function clearRegion(
  bitmap: Uint8Array,
  w: number,
  h: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const left = Math.max(0, Math.min(x0, x1));
  const right = Math.min(w - 1, Math.max(x0, x1));
  const top = Math.max(0, Math.min(y0, y1));
  const bottom = Math.min(h - 1, Math.max(y0, y1));
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      setPixel(bitmap, x, y, w, h, 0);
    }
  }
}

/** Pastes a region onto dest at (atX, atY), OR-combining pixels, clamped to dest bounds. */
export function pasteRegion(
  dest: Uint8Array,
  destW: number,
  destH: number,
  region: Region,
  atX: number,
  atY: number,
) {
  for (let y = 0; y < region.h; y++) {
    for (let x = 0; x < region.w; x++) {
      if (!region.bitmap[y * region.w + x]) continue;
      const dx = atX + x;
      const dy = atY + y;
      if (dx >= 0 && dy >= 0 && dx < destW && dy < destH) {
        dest[dy * destW + dx] = 1;
      }
    }
  }
}
