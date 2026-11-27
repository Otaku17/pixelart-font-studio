import opentype from 'opentype.js';
import type { Project } from '../types';
import { fixSfntChecksums } from './sfntChecksum';

/** Pixel column 1 is the glyph origin; column 0 is left padding (see rasterize). */
export const ORIGIN_COLUMN = 1;

function bitmapToPath(
  bitmap: Uint8Array,
  gridW: number,
  gridH: number,
  baselineRow: number,
  scale: number,
): opentype.Path {
  const path = new opentype.Path();
  for (let y = 0; y < gridH; y++) {
    let xStart = -1;
    for (let x = 0; x <= gridW; x++) {
      const on = x < gridW && bitmap[y * gridW + x];
      if (on && xStart < 0) xStart = x;
      else if (!on && xStart >= 0) {
        const x0 = (xStart - ORIGIN_COLUMN) * scale;
        const x1 = (x - ORIGIN_COLUMN) * scale;
        const y0 = (baselineRow - y) * scale;
        const y1 = y0 + scale;
        path.moveTo(x0, y0);
        path.lineTo(x0, y1);
        path.lineTo(x1, y1);
        path.lineTo(x1, y0);
        path.closePath();
        xStart = -1;
      }
    }
  }
  return path;
}

/**
 * Rebuilds a real font from the bitmap glyphs, restoring the original font
 * metrics (units per em, ascender/descender) when the project came from an
 * imported font, or sensible defaults for a from-scratch project.
 */
export function buildFontArrayBuffer(project: Project, familyName = project.fontName): ArrayBuffer {
  const { gridW, gridH, baselineRow, order, glyphs, metrics } = project;
  const { unitsPerEm, ascender, nativeSize } = metrics;
  const scale = unitsPerEm / nativeSize;

  let descender = metrics.descender;
  if (descender > 0) descender = -descender;
  else if (descender === 0) descender = -((gridH - baselineRow) * scale);

  const out: opentype.Glyph[] = [
    new opentype.Glyph({
      name: '.notdef',
      unicode: 0,
      advanceWidth: Math.max(1, gridW) * scale,
      path: new opentype.Path(),
    }),
  ];
  const seen = new Set<number>();

  for (const key of order) {
    const g = glyphs[key];
    const cp = parseInt(key, 10);
    if (!g || !Number.isFinite(cp) || cp === 0 || seen.has(cp)) continue;
    seen.add(cp);
    out.push(
      new opentype.Glyph({
        name: 'uni' + cp.toString(16).toUpperCase().padStart(4, '0'),
        unicode: cp,
        advanceWidth: Math.max(1, Math.round(g.advance - ORIGIN_COLUMN)) * scale,
        path: bitmapToPath(g.bitmap, gridW, gridH, baselineRow, scale),
      }),
    );
  }

  const font = new opentype.Font({
    familyName: familyName || 'PixelArtFont',
    styleName: 'Regular',
    unitsPerEm,
    ascender,
    descender,
    glyphs: out,
  });

  const buffer = fixSfntChecksums(font.toArrayBuffer());
  // Sanity check: re-parse to make sure we produced a valid font.
  opentype.parse(buffer);
  return buffer;
}
