export interface Glyph {
  /** 0/1 bitmap, row-major, length = gridW * gridH */
  bitmap: Uint8Array;
  advance: number;
  char: string;
  edited: boolean;
  sourceRasterized: boolean;
}

/** Metrics of the font a project was imported from (defaults for blank projects). */
export interface FontMetrics {
  unitsPerEm: number;
  ascender: number;
  descender: number;
  nativeSize: number;
}

/** A whole font project, independent of any UI state. */
export interface Project {
  fontName: string;
  gridW: number;
  gridH: number;
  baselineRow: number;
  metrics: FontMetrics;
  glyphs: Record<string, Glyph>;
  /** Glyph keys (decimal codepoints) in display order. */
  order: string[];
}
