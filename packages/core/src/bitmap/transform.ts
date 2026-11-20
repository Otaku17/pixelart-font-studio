// Whole-glyph transforms (dst = f(src)).

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


export type TransformName =
  | 'mirrorH'
  | 'mirrorV'
  | 'invert'
  | 'shiftLeft'
  | 'shiftRight'
  | 'shiftUp'
  | 'shiftDown';

/** Named transforms, handy for toolbars and keyboard commands. */
export const TRANSFORMS: Record<
  TransformName,
  (src: Uint8Array, w: number, h: number) => Uint8Array
> = {
  mirrorH: mirrorHorizontal,
  mirrorV: mirrorVertical,
  invert,
  shiftLeft,
  shiftRight,
  shiftUp,
  shiftDown,
};
