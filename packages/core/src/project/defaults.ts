import type { FontMetrics, Glyph, Project } from '../types';
import { blankBitmap } from '../bitmap/draw';

export const DEFAULT_FONT_NAME = 'New font';
export const DEFAULT_GRID_W = 16;
export const DEFAULT_GRID_H = 16;
export const DEFAULT_BASELINE_ROW = Math.round(DEFAULT_GRID_H * 0.82);
export const DEFAULT_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export const DEFAULT_METRICS: FontMetrics = {
  unitsPerEm: 1000,
  ascender: 800,
  descender: -200,
  nativeSize: 16,
};

export function charFromCodepoint(cp: number): string {
  try {
    return String.fromCodePoint(cp);
  } catch {
    return '?';
  }
}

export function makeGlyph(gridW: number, gridH: number, char: string): Glyph {
  return {
    bitmap: blankBitmap(gridW, gridH),
    advance: gridW,
    char,
    edited: false,
    sourceRasterized: false,
  };
}

/** Sorts glyph keys by numeric codepoint. */
export function sortKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
}

export function createBlankProject(): Project {
  const glyphs: Record<string, Glyph> = {};
  const order: string[] = [];
  for (const ch of DEFAULT_CHARS) {
    const key = String(ch.codePointAt(0));
    glyphs[key] = makeGlyph(DEFAULT_GRID_W, DEFAULT_GRID_H, ch);
    order.push(key);
  }
  return {
    fontName: DEFAULT_FONT_NAME,
    gridW: DEFAULT_GRID_W,
    gridH: DEFAULT_GRID_H,
    baselineRow: DEFAULT_BASELINE_ROW,
    metrics: { ...DEFAULT_METRICS },
    glyphs,
    order,
  };
}
