// Pure bitmap operations, ported 1:1 from the original vanilla-JS editor.
// All bitmaps are Uint8Array of length W*H, row-major, 0 = empty, 1 = filled.

export function blankBitmap(w: number, h: number): Uint8Array {
  return new Uint8Array(w * h);
}

export function setPixel(
  bitmap: Uint8Array,
  x: number,
  y: number,
  w: number,
  h: number,
  val: number,
) {
  if (x >= 0 && y >= 0 && x < w && y < h) bitmap[y * w + x] = val;
}

export function getPixel(
  bitmap: Uint8Array,
  x: number,
  y: number,
  w: number,
  h: number,
): number {
  if (x < 0 || y < 0 || x >= w || y >= h) return 0;
  return bitmap[y * w + x];
}

export function floodFill(
  bitmap: Uint8Array,
  x: number,
  y: number,
  w: number,
  h: number,
  targetVal: number,
  replacementVal: number,
) {
  if (targetVal === replacementVal) return;
  const qx = new Int32Array(w * h);
  const qy = new Int32Array(w * h);
  let qh = 0;
  let qt = 0;
  qx[qt] = x;
  qy[qt] = y;
  qt++;
  while (qh < qt) {
    const cx = qx[qh];
    const cy = qy[qh];
    qh++;
    const idx = cy * w + cx;
    if (bitmap[idx] !== targetVal) continue;
    bitmap[idx] = replacementVal;

    if (cx > 0) {
      const nidx = cy * w + (cx - 1);
      if (bitmap[nidx] === targetVal) {
        qx[qt] = cx - 1;
        qy[qt] = cy;
        qt++;
      }
    }
    if (cx < w - 1) {
      const nidx = cy * w + (cx + 1);
      if (bitmap[nidx] === targetVal) {
        qx[qt] = cx + 1;
        qy[qt] = cy;
        qt++;
      }
    }
    if (cy > 0) {
      const nidx = (cy - 1) * w + cx;
      if (bitmap[nidx] === targetVal) {
        qx[qt] = cx;
        qy[qt] = cy - 1;
        qt++;
      }
    }
    if (cy < h - 1) {
      const nidx = (cy + 1) * w + cx;
      if (bitmap[nidx] === targetVal) {
        qx[qt] = cx;
        qy[qt] = cy + 1;
        qt++;
      }
    }
  }
}

export function drawLine(
  bitmap: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number,
  h: number,
  val: number,
) {
  let cx0 = x0;
  let cy0 = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    setPixel(bitmap, cx0, cy0, w, h, val);
    if (cx0 === x1 && cy0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy0 += sy;
    }
  }
}

export function drawRect(
  bitmap: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number,
  h: number,
  val: number,
) {
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      setPixel(bitmap, x, y, w, h, val);
    }
  }
}

// -------- Whole-glyph transforms (dst = f(src)) --------

export function mirrorHorizontal(
  src: Uint8Array,
  w: number,
  h: number,
): Uint8Array {
  const dst = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) dst[y * w + (w - 1 - x)] = src[y * w + x];
  return dst;
}

export function mirrorVertical(
  src: Uint8Array,
  w: number,
  h: number,
): Uint8Array {
  const dst = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) dst[(h - 1 - y) * w + x] = src[y * w + x];
  return dst;
}

export function shiftLeft(src: Uint8Array, w: number, h: number): Uint8Array {
  const dst = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w - 1; x++) dst[y * w + x] = src[y * w + x + 1];
  return dst;
}

export function shiftRight(src: Uint8Array, w: number, h: number): Uint8Array {
  const dst = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = w - 1; x > 0; x--) dst[y * w + x] = src[y * w + x - 1];
  return dst;
}

export function shiftUp(src: Uint8Array, w: number, h: number): Uint8Array {
  const dst = new Uint8Array(w * h);
  for (let y = 0; y < h - 1; y++)
    for (let x = 0; x < w; x++) dst[y * w + x] = src[(y + 1) * w + x];
  return dst;
}

export function shiftDown(src: Uint8Array, w: number, h: number): Uint8Array {
  const dst = new Uint8Array(w * h);
  for (let y = h - 1; y > 0; y--)
    for (let x = 0; x < w; x++) dst[y * w + x] = src[(y - 1) * w + x];
  return dst;
}

export function invert(src: Uint8Array, w: number, h: number): Uint8Array {
  const dst = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) dst[i] = src[i] ? 0 : 1;
  return dst;
}

// -------- Rectangular selection helpers --------

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
