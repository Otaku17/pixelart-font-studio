export type Tool = 'pencil' | 'eraser' | 'bucket' | 'line' | 'rect' | 'select';

export interface Glyph {
  /** 0/1 bitmap, row-major, length = gridW * gridH */
  bitmap: Uint8Array;
  advance: number;
  char: string;
  edited: boolean;
  sourceRasterized: boolean;
}

export interface GlyphJSON {
  bitmap: number[];
  advance: number;
  char: string;
  edited: boolean;
  sourceRasterized: boolean;
}

export interface ProjectJSON {
  version: number;
  fontName: string;
  gridW: number;
  gridH: number;
  baselineRow: number;
  glyphs: Record<string, GlyphJSON>;
}

/** ISO-639-1-ish language code, e.g. 'fr', 'en'. The actual set of supported
 * codes is determined at runtime by which files exist in assets/locales. */
export type Lang = string;
