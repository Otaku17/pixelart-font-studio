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

