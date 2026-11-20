import type { FontMetrics, Glyph, Project } from '../types';
import { DEFAULT_METRICS, charFromCodepoint, sortKeys } from './defaults';
import { bitmapToRows, fitBitmap, rowsToBitmap } from './rows';

export const PROJECT_FORMAT = 'pixelart-font-studio';
export const PROJECT_VERSION = 2;

interface GlyphV2 {
  codepoint: number;
  char: string;
  advance: number;
  edited?: boolean;
  rasterized?: boolean;
  rows: string[];
}

export interface ProjectFileV2 {
  format: typeof PROJECT_FORMAT;
  version: 2;
  fontName: string;
  grid: { width: number; height: number; baseline: number };
  metrics: FontMetrics;
  glyphs: GlyphV2[];
}

/** Legacy format written by 1.0.x: flat 0/1 arrays, no metrics. */
interface ProjectFileV1 {
  version?: 1;
  fontName?: string;
  gridW?: number;
  gridH?: number;
  baselineRow?: number;
  glyphs: Record<string, { bitmap?: number[]; advance?: number; char?: string; edited?: boolean; sourceRasterized?: boolean }>;
}

export function serializeProject(p: Project): ProjectFileV2 {
  return {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    fontName: p.fontName,
    grid: { width: p.gridW, height: p.gridH, baseline: p.baselineRow },
    metrics: { ...p.metrics },
    glyphs: p.order
      .filter((key) => p.glyphs[key])
      .map((key) => {
        const g = p.glyphs[key];
        return {
          codepoint: parseInt(key, 10),
          char: g.char,
          advance: g.advance,
          ...(g.edited ? { edited: true } : {}),
          ...(g.sourceRasterized ? { rasterized: true } : {}),
          rows: bitmapToRows(g.bitmap, p.gridW, p.gridH),
        };
      }),
  };
}

/** Indented JSON: one glyph row per line, so files stay readable. */
export function stringifyProject(p: Project): string {
  return JSON.stringify(serializeProject(p), null, 2) + '\n';
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function fromV2(f: ProjectFileV2): Project {
  const w = num(f.grid?.width, 16);
  const h = num(f.grid?.height, 16);
  const glyphs: Record<string, Glyph> = {};
  const order: string[] = [];
  for (const g of f.glyphs ?? []) {
    const key = String(g.codepoint);
    if (!Number.isFinite(g.codepoint) || glyphs[key]) continue;
    glyphs[key] = {
      bitmap: rowsToBitmap(g.rows ?? [], w, h),
      advance: num(g.advance, w),
      char: g.char || charFromCodepoint(g.codepoint),
      edited: !!g.edited,
      sourceRasterized: !!g.rasterized,
    };
    order.push(key);
  }
  return {
    fontName: f.fontName || 'Font',
    gridW: w,
    gridH: h,
    baselineRow: num(f.grid?.baseline, Math.round(h * 0.82)),
    metrics: { ...DEFAULT_METRICS, ...f.metrics },
    glyphs,
    order,
  };
}

function fromV1(f: ProjectFileV1): Project {
  const w = num(f.gridW, 16);
  const h = num(f.gridH, 16);
  const glyphs: Record<string, Glyph> = {};
  const order = sortKeys(Object.keys(f.glyphs));
  for (const key of order) {
    const item = f.glyphs[key];
    glyphs[key] = {
      bitmap: fitBitmap(item.bitmap ?? [], w, h),
      advance: num(item.advance, w),
      char: item.char || charFromCodepoint(parseInt(key, 10)),
      edited: !!item.edited,
      sourceRasterized: !!item.sourceRasterized,
    };
  }
  return {
    fontName: f.fontName || 'Font',
    gridW: w,
    gridH: h,
    baselineRow: num(f.baselineRow, Math.round(h * 0.82)),
    metrics: { ...DEFAULT_METRICS },
    glyphs,
    order,
  };
}

/** Parses a project file of any known version. Throws on invalid input. */
export function parseProject(text: string): Project {
  const data = JSON.parse(text) as Partial<ProjectFileV2> & Partial<ProjectFileV1>;
  if (!data || typeof data !== 'object') throw new Error('Invalid project');
  if (data.format === PROJECT_FORMAT && Array.isArray(data.glyphs)) {
    return fromV2(data as ProjectFileV2);
  }
  if (data.glyphs && typeof data.glyphs === 'object' && !Array.isArray(data.glyphs)) {
    return fromV1(data as ProjectFileV1);
  }
  throw new Error('Invalid project');
}
