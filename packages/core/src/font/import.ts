import opentype from 'opentype.js';
import type { Glyph, Project } from '../types';
import { charFromCodepoint } from '../project/defaults';
import { detectNativeFontSize } from './detect';
import { rasterizeGlyph } from './rasterize';

export function parseFontFile(buffer: ArrayBuffer): opentype.Font {
  return opentype.parse(buffer);
}

function readCmap(font: opentype.Font): Record<string, number> | null {
  try {
    const tables = font.tables as { cmap?: { glyphIndexMap?: Record<string, number> } };
    return tables.cmap?.glyphIndexMap ?? null;
  } catch {
    return null;
  }
}

function familyOf(font: opentype.Font): string | undefined {
  const names = font.names as { fontFamily?: { en?: string } } | undefined;
  return names?.fontFamily?.en;
}

/** Loads a parsed opentype.js font into a fresh project (grid size, baseline, glyphs). */
export function loadFontIntoProject(font: opentype.Font, familyName: string): Project {
  const nativeSize = detectNativeFontSize(font);
  const unitsPerEm = font.unitsPerEm || 1000;

  const gridH = Math.max(16, nativeSize + 4);
  const gridW = gridH;
  const scale = nativeSize / unitsPerEm;
  const baselineRow = Math.round((font.ascender || 800) * scale) + 2;

  const glyphs: Record<string, Glyph> = {};
  const order: string[] = [];
  const map = readCmap(font);

  if (map) {
    const codepoints = Object.keys(map)
      .map((k) => parseInt(k, 10))
      .sort((a, b) => a - b);
    for (const cp of codepoints) {
      if (cp < 32) continue;
      const glyph = font.glyphs.get(map[cp]);
      const { bitmap, advance } = rasterizeGlyph(font, glyph, gridW, gridH, nativeSize, baselineRow);
      const key = String(cp);
      glyphs[key] = {
        bitmap,
        advance,
        char: charFromCodepoint(cp),
        edited: false,
        sourceRasterized: true,
      };
      order.push(key);
    }
  }

  return {
    fontName: familyName || familyOf(font) || 'Imported font',
    gridW,
    gridH,
    baselineRow,
    metrics: {
      unitsPerEm,
      ascender: font.ascender || 800,
      descender: font.descender || -200,
      nativeSize,
    },
    glyphs,
    order,
  };
}
