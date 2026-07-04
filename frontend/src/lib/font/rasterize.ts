import opentype from 'opentype.js';
import type { Glyph } from '../../types';

export interface LoadedFontProject {
  gridW: number;
  gridH: number;
  baselineRow: number;
  fontName: string;
  originalUnitsPerEm: number;
  originalAscender: number;
  originalDescender: number;
  originalNativeSize: number;
  glyphs: Record<string, Glyph>;
  order: string[];
}

export function charFromCodepoint(cp: number): string {
  try {
    return String.fromCodePoint(cp);
  } catch {
    return '?';
  }
}

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
      glyph.path.commands.forEach((c: any) => {
        if (c.x !== undefined) xs.push(c.x);
        if (c.y !== undefined) ys.push(c.y);
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

/** Pixel-perfect rendering of a single glyph at the font's native size, aligned to the grid/baseline. */
export function rasterizeGlyph(
  font: opentype.Font,
  glyph: opentype.Glyph,
  gridW: number,
  gridH: number,
  nativeFontSize: number,
  baselineRow: number,
): { bitmap: Uint8Array; advance: number } {
  const off = document.createElement('canvas');
  const canvasSize = nativeFontSize * 4;
  off.width = canvasSize;
  off.height = canvasSize;
  const octx = off.getContext('2d', { willReadFrequently: true })!;
  octx.imageSmoothingEnabled = false;

  const scale = nativeFontSize / font.unitsPerEm;
  const pixelAscender = Math.round(
    (font.ascender || font.unitsPerEm * 0.8) * scale,
  );

  const drawX = nativeFontSize;
  const drawY = nativeFontSize + pixelAscender;

  octx.fillStyle = '#fff';
  octx.fillRect(0, 0, canvasSize, canvasSize);

  try {
    const path = glyph.getPath(drawX, drawY, nativeFontSize);
    path.fill = '#000';
    path.draw(octx as any);
  } catch {
    // ignore malformed glyph paths
  }

  const imgData = octx.getImageData(0, 0, canvasSize, canvasSize).data;
  const bitmap = new Uint8Array(gridW * gridH);

  const gridStartX = 1; // 1px left padding, kept for parity with TTF export offset
  const gridBaseline = baselineRow;

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const cy = drawY + (gy - gridBaseline);
      const cx = drawX + (gx - gridStartX);

      if (cx >= 0 && cx < canvasSize && cy >= 0 && cy < canvasSize) {
        const idx = (cy * canvasSize + cx) * 4;
        if (imgData[idx] < 128) {
          bitmap[gy * gridW + gx] = 1;
        }
      }
    }
  }

  const advancePx = Math.round((glyph.advanceWidth || font.unitsPerEm) * scale);
  const advance = Math.min(gridW, Math.max(1, gridStartX + advancePx));

  return { bitmap, advance };
}

/** Loads a parsed opentype.js font into a fresh project (grid size, baseline, glyphs). */
export function loadFontIntoProject(
  font: opentype.Font,
  familyName: string,
): LoadedFontProject {
  const nativeSize = detectNativeFontSize(font);

  const originalUnitsPerEm = font.unitsPerEm || 1000;
  const originalAscender = font.ascender || 800;
  const originalDescender = font.descender || -200;
  const originalNativeSize = nativeSize;

  const gridH = Math.max(16, nativeSize + 4);
  const gridW = gridH;

  const scale = nativeSize / (font.unitsPerEm || 1000);
  const pixelAscender = Math.round((font.ascender || 800) * scale);
  const baselineRow = pixelAscender + 2;

  const fontName =
    familyName ||
    (font.names &&
      (font.names as any).fontFamily &&
      (font.names as any).fontFamily.en) ||
    'Police importée';

  const glyphs: Record<string, Glyph> = {};
  const order: string[] = [];

  let map: Record<string, number> | null = null;
  try {
    map = (font.tables as any).cmap.glyphIndexMap;
  } catch {
    map = null;
  }

  if (map) {
    const codepoints = Object.keys(map)
      .map((k) => parseInt(k, 10))
      .sort((a, b) => a - b);

    codepoints.forEach((cp) => {
      if (cp < 32) return;
      const gi = map![cp];
      const glyph = font.glyphs.get(gi);
      const { bitmap, advance } = rasterizeGlyph(
        font,
        glyph,
        gridW,
        gridH,
        nativeSize,
        baselineRow,
      );
      const key = String(cp);
      glyphs[key] = {
        bitmap,
        advance,
        char: charFromCodepoint(cp),
        edited: false,
        sourceRasterized: true,
      };
      order.push(key);
    });
  }

  return {
    gridW,
    gridH,
    baselineRow,
    fontName,
    originalUnitsPerEm,
    originalAscender,
    originalDescender,
    originalNativeSize,
    glyphs,
    order,
  };
}

export async function parseFontFile(
  buffer: ArrayBuffer,
): Promise<opentype.Font> {
  return opentype.parse(buffer);
}
