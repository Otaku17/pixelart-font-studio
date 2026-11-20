import type { Project } from '../types';
import { ORIGIN_COLUMN } from '../font/ttf';

export type GlyphScope = 'all' | 'nonEmpty' | 'edited';

export interface RasterOptions {
  /** Output pixels per font pixel (1–8). */
  scale: number;
  /** Gap between cells and around the sheet, in output pixels. */
  padding: number;
  /** 0 = automatic (roughly square sheet). */
  columns: number;
  ink: string;
  /** null = transparent background. */
  background: string | null;
  scope: GlyphScope;
}

export const DEFAULT_RASTER: RasterOptions = {
  scale: 1,
  padding: 1,
  columns: 0,
  ink: '#ffffff',
  background: null,
  scope: 'all',
};

export interface AtlasCell {
  key: string;
  codepoint: number;
  char: string;
  x: number;
  y: number;
  /** Advance in output pixels, measured from the origin column. */
  advance: number;
}

export interface AtlasLayout {
  width: number;
  height: number;
  columns: number;
  rows: number;
  cellW: number;
  cellH: number;
  scale: number;
  cells: AtlasCell[];
}

function isEmpty(bitmap: Uint8Array): boolean {
  for (let i = 0; i < bitmap.length; i++) if (bitmap[i]) return false;
  return true;
}

/** Glyph keys kept by the given scope, in project order. */
export function selectKeys(project: Project, scope: GlyphScope): string[] {
  return project.order.filter((key) => {
    const g = project.glyphs[key];
    if (!g) return false;
    if (scope === 'edited') return g.edited;
    if (scope === 'nonEmpty') return !isEmpty(g.bitmap) || g.char === ' ';
    return true;
  });
}

export function layoutAtlas(project: Project, opts: RasterOptions): AtlasLayout {
  const keys = selectKeys(project, opts.scope);
  const scale = Math.max(1, Math.round(opts.scale));
  const pad = Math.max(0, Math.round(opts.padding));
  const count = Math.max(1, keys.length);
  const columns = opts.columns > 0 ? Math.min(opts.columns, count) : Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const cellW = project.gridW * scale;
  const cellH = project.gridH * scale;

  const cells = keys.map((key, i) => {
    const g = project.glyphs[key];
    return {
      key,
      codepoint: parseInt(key, 10),
      char: g.char,
      x: pad + (i % columns) * (cellW + pad),
      y: pad + Math.floor(i / columns) * (cellH + pad),
      advance: Math.max(1, Math.round(g.advance - ORIGIN_COLUMN)) * scale,
    };
  });

  return {
    width: pad + columns * (cellW + pad),
    height: pad + rows * (cellH + pad),
    columns,
    rows,
    cellW,
    cellH,
    scale,
    cells,
  };
}

/** Machine-readable metrics that go next to an atlas PNG. */
export function atlasMetricsJSON(project: Project, layout: AtlasLayout, image: string): string {
  const s = layout.scale;
  const glyphs: Record<string, object> = {};
  for (const c of layout.cells) {
    glyphs[c.char] = {
      codepoint: c.codepoint,
      x: c.x,
      y: c.y,
      width: layout.cellW,
      height: layout.cellH,
      xoffset: -ORIGIN_COLUMN * s,
      advance: c.advance,
    };
  }
  const data = {
    name: project.fontName,
    image,
    size: { width: layout.width, height: layout.height },
    cell: { width: layout.cellW, height: layout.cellH },
    scale: s,
    baseline: project.baselineRow * s,
    lineHeight: layout.cellH,
    glyphs,
  };
  return JSON.stringify(data, null, 2) + '\n';
}
