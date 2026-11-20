import { DEFAULT_RASTER, FORMATS, type ExportFormat } from '@pfs/core';
import type { ExportSettings } from '../machines/export';

const KEY = 'pafs.export';

/** Last export choice of this user (light convenience, may be empty). */
export function loadExportSettings(): Partial<ExportSettings> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<ExportSettings>;
    const format = raw.format && raw.format in FORMATS ? (raw.format as ExportFormat) : undefined;
    return { format, raster: { ...DEFAULT_RASTER, ...raw.raster } };
  } catch {
    return {};
  }
}

export function saveExportSettings(settings: ExportSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable: the choice just won't persist
  }
}
