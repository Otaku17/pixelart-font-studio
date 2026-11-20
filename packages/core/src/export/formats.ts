import type { Project } from '../types';
import { buildFontArrayBuffer } from '../font/ttf';
import { stringifyProject } from '../project/format';
import { canvasToPngBase64, renderAtlasCanvas, renderGlyphCanvas } from '../render/canvas';
import { atlasMetricsJSON, layoutAtlas, type RasterOptions } from './atlas';
import { buildBMFont } from './bmfont';

export type ExportFormat = 'ttf' | 'bmfont' | 'atlas' | 'glyph' | 'project';

export interface FormatInfo {
  id: ExportFormat;
  /** Extension of the file picked in the save dialog. */
  ext: string;
  /** Extra files written next to it (same base name). */
  companions: string[];
  /** Whether the raster options (scale, colors…) apply. */
  raster: boolean;
}

export const FORMATS: Record<ExportFormat, FormatInfo> = {
  ttf: { id: 'ttf', ext: 'ttf', companions: [], raster: false },
  bmfont: { id: 'bmfont', ext: 'fnt', companions: ['png'], raster: true },
  atlas: { id: 'atlas', ext: 'png', companions: ['json'], raster: true },
  glyph: { id: 'glyph', ext: 'png', companions: [], raster: true },
  project: { id: 'project', ext: 'json', companions: [], raster: false },
};

export interface ExportFile {
  /** File name: base name + extension. */
  name: string;
  encoding: 'text' | 'base64';
  data: string;
}

export interface ExportRequest {
  project: Project;
  format: ExportFormat;
  raster: RasterOptions;
  /** Base name chosen by the user, without extension. */
  baseName: string;
  /** Glyph used by the single-glyph format. */
  glyphKey: string | null;
}

export function safeFileName(name: string, fallback = 'font'): string {
  const cleaned = name.trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_');
  return cleaned || fallback;
}

export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** Builds every file of an export. Throws when there is nothing to export. */
export async function buildExport(req: ExportRequest): Promise<ExportFile[]> {
  const { project, raster, baseName } = req;
  const file = (ext: string, encoding: ExportFile['encoding'], data: string): ExportFile => ({
    name: `${baseName}.${ext}`,
    encoding,
    data,
  });

  switch (req.format) {
    case 'project':
      return [file('json', 'text', stringifyProject(project))];
    case 'ttf':
      if (!project.order.length) throw new Error('empty');
      return [file('ttf', 'base64', bufferToBase64(buildFontArrayBuffer(project)))];
    case 'glyph': {
      const g = req.glyphKey ? project.glyphs[req.glyphKey] : undefined;
      if (!g) throw new Error('no-glyph');
      const canvas = renderGlyphCanvas(g.bitmap, project.gridW, project.gridH, raster);
      return [file('png', 'base64', await canvasToPngBase64(canvas))];
    }
    case 'atlas':
    case 'bmfont': {
      const layout = layoutAtlas(project, raster);
      if (!layout.cells.length) throw new Error('empty');
      const png = await canvasToPngBase64(renderAtlasCanvas(project, layout, raster));
      const image = `${baseName}.png`;
      const meta =
        req.format === 'bmfont'
          ? file('fnt', 'text', buildBMFont(project, layout, image))
          : file('json', 'text', atlasMetricsJSON(project, layout, image));
      return [meta, file('png', 'base64', png)];
    }
  }
}
