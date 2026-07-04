import opentype from 'opentype.js';
import type { Glyph } from '../../types';

export interface TTFExportParams {
  fontName: string;
  gridW: number;
  gridH: number;
  baselineRow: number;
  originalUnitsPerEm: number;
  originalAscender: number;
  originalDescender: number;
  originalNativeSize: number;
  glyphs: Record<string, Glyph>;
  order: string[];
}

/**
 * Rebuilds a real TrueType font from the bitmap glyphs, restoring the
 * original font metrics (units per em, ascender/descender) when the
 * project originated from an imported font, or sensible defaults for a
 * from-scratch project.
 */
export function buildTTFArrayBuffer(params: TTFExportParams): ArrayBuffer {
  const { fontName, gridW, gridH, baselineRow, originalUnitsPerEm, originalNativeSize, order, glyphs } = params;

  const unitsPerEm = originalUnitsPerEm;
  const ascender = params.originalAscender;

  let descender = params.originalDescender;
  if (descender > 0) {
    descender = -descender;
  } else if (descender === 0) {
    descender = -((gridH - baselineRow) * (unitsPerEm / originalNativeSize));
  }

  const scale = unitsPerEm / originalNativeSize;

  function bitmapToPath(bitmap: Uint8Array): opentype.Path {
    const path = new opentype.Path();

    for (let y = 0; y < gridH; y++) {
      let inSpan = false;
      let xStart = 0;

      for (let x = 0; x <= gridW; x++) {
        const hasPixel = x < gridW && bitmap[y * gridW + x];

        if (hasPixel && !inSpan) {
          inSpan = true;
          xStart = x;
        } else if (!hasPixel && inSpan) {
          inSpan = false;

          const x0 = (xStart - 1) * scale;
          const x1 = (x - 1) * scale;

          const yy = baselineRow - y;
          const y0 = yy * scale;
          const y1 = y0 + scale;

          path.moveTo(x0, y0);
          path.lineTo(x0, y1);
          path.lineTo(x1, y1);
          path.lineTo(x1, y0);
          path.closePath();
        }
      }
    }
    return path;
  }

  const notdef = new opentype.Glyph({
    name: '.notdef',
    unicode: 0,
    advanceWidth: Math.max(1, gridW) * scale,
    path: new opentype.Path()
  });

  const outGlyphs: opentype.Glyph[] = [notdef];
  const seen = new Set<number>();

  order.forEach((key) => {
    const g = glyphs[key];
    const codepoint = parseInt(key, 10);
    if (!Number.isFinite(codepoint) || codepoint === 0) return;
    if (seen.has(codepoint)) return;
    seen.add(codepoint);

    const glyphPath = bitmapToPath(g.bitmap);
    const advanceWidth = Math.max(1, Math.round(g.advance - 1)) * scale;

    const glyph = new opentype.Glyph({
      name: 'uni' + codepoint.toString(16).toUpperCase().padStart(4, '0'),
      unicode: codepoint,
      advanceWidth,
      path: glyphPath
    });

    outGlyphs.push(glyph);
  });

  const font = new opentype.Font({
    familyName: fontName || 'PixelArtFont',
    styleName: 'Regular',
    unitsPerEm,
    ascender,
    descender,
    glyphs: outGlyphs,
    copyright: '',
    fontVersion: 1,
    weight: 400,
    width: 5
  } as any);

  const buffer = font.toArrayBuffer();
  // Sanity check: re-parse to make sure we produced a valid font.
  opentype.parse(buffer);
  return buffer;
}
