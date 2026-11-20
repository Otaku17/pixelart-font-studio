import { buildExport, FORMATS, safeFileName, type ExportFormat, type RasterOptions } from '@pfs/core';
import type { TextKey } from '../i18n';
import { getEditor, getProject } from '../state/editor/store';
import { t } from '../state/prefs';
import { pickSavePath, splitPath, writeFiles } from './fileIO';

export const FORMAT_LABEL: Record<ExportFormat, TextKey> = {
  ttf: 'formatTtf',
  bmfont: 'formatBmfont',
  atlas: 'formatAtlas',
  glyph: 'formatGlyph',
  project: 'formatProject',
};

/** Error whose message is a translation key. */
export class ExportError extends Error {
  constructor(public readonly key: TextKey) {
    super(key);
  }
}

function defaultBaseName(format: ExportFormat): string {
  const ctx = getEditor();
  if (format === 'glyph') {
    const g = ctx.currentKey ? ctx.glyphs[ctx.currentKey] : undefined;
    const label = !g ? 'glyph' : g.char === ' ' ? 'space' : `U+${Number(ctx.currentKey).toString(16).toUpperCase().padStart(4, '0')}`;
    return `${safeFileName(ctx.fontName)}_${label}`;
  }
  return safeFileName(ctx.fontName);
}

/**
 * Asks for a destination, then writes every file of the export next to it.
 * Resolves with the written file names, or null when the user cancelled.
 */
export async function runExport(format: ExportFormat, raster: RasterOptions): Promise<string[] | null> {
  const info = FORMATS[format];
  const ctx = getEditor();
  if (format === 'glyph' && !ctx.currentKey) throw new ExportError('exportErrorNoGlyph');

  const path = await pickSavePath(`${defaultBaseName(format)}.${info.ext}`, t(FORMAT_LABEL[format]), info.ext);
  if (!path) return null;
  const { dir, stem } = splitPath(path);

  let files;
  try {
    files = await buildExport({
      project: getProject(),
      format,
      raster,
      baseName: stem,
      glyphKey: ctx.currentKey,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'empty') throw new ExportError('exportErrorEmpty');
    if (msg === 'no-glyph') throw new ExportError('exportErrorNoGlyph');
    throw err;
  }
  await writeFiles(dir, files);
  return files.map((f) => f.name);
}
