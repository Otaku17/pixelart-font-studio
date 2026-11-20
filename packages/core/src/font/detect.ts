import opentype from 'opentype.js';

/**
 * Detects the "native" pixel size of a bitmap-style vector font by looking
 * at the smallest recurring coordinate deltas in a handful of straight-edged
 * glyphs. This lets us rasterize pixel fonts at their true intended size
 * instead of an arbitrary resolution.
 */
export function detectNativeFontSize(font: opentype.Font): number {
  let minWidth = Infinity;
  const chars = ['.', 'i', 'l', '1', ':', '|', 'A', 'T', 'H'];

  chars.forEach((char) => {
    const glyph = font.charToGlyph(char);
    if (glyph && glyph.path && glyph.path.commands) {
      let xs: number[] = [];
      let ys: number[] = [];
      glyph.path.commands.forEach((c) => {
        const p = c as { x?: number; y?: number };
        if (p.x !== undefined) xs.push(p.x);
        if (p.y !== undefined) ys.push(p.y);
      });
      if (xs.length > 1) {
        xs = [...new Set(xs)].sort((a, b) => a - b);
        for (let i = 1; i < xs.length; i++) {
          const diff = Math.abs(xs[i] - xs[i - 1]);
          if (diff > 1 && diff < minWidth) minWidth = diff;
        }
      }
      if (ys.length > 1) {
        ys = [...new Set(ys)].sort((a, b) => a - b);
        for (let i = 1; i < ys.length; i++) {
          const diff = Math.abs(ys[i] - ys[i - 1]);
          if (diff > 1 && diff < minWidth) minWidth = diff;
        }
      }
    }
  });

  if (minWidth === Infinity) return 16;
  const nativeSize = Math.round(font.unitsPerEm / minWidth);
  return nativeSize > 128 ? 16 : nativeSize;
}
