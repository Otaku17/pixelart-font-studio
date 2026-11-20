// Human-readable bitmap rows: '#' = filled, '.' = empty.
// Readable in any text editor and diff-friendly under git.

export const ON = '#';
export const OFF = '.';

export function bitmapToRows(bitmap: Uint8Array, w: number, h: number): string[] {
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) row += bitmap[y * w + x] ? ON : OFF;
    rows.push(row);
  }
  return rows;
}

/** Tolerant parse: missing rows/cells stay empty, extra ones are ignored. */
export function rowsToBitmap(rows: string[], w: number, h: number): Uint8Array {
  const bitmap = new Uint8Array(w * h);
  for (let y = 0; y < Math.min(h, rows.length); y++) {
    const row = rows[y] ?? '';
    for (let x = 0; x < Math.min(w, row.length); x++) {
      const c = row[x];
      if (c !== OFF && c !== ' ' && c !== '0') bitmap[y * w + x] = 1;
    }
  }
  return bitmap;
}

/** Copies a flat 0/1 array into a w*h bitmap, padding or truncating. */
export function fitBitmap(raw: ArrayLike<number>, w: number, h: number): Uint8Array {
  const bitmap = new Uint8Array(w * h);
  const n = Math.min(raw.length, bitmap.length);
  for (let i = 0; i < n; i++) bitmap[i] = raw[i] ? 1 : 0;
  return bitmap;
}
