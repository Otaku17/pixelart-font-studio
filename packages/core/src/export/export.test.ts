import opentype from 'opentype.js';
import { describe, expect, it } from 'vitest';
import { createBlankProject } from '../project/defaults';
import { buildFontArrayBuffer } from '../font/ttf';
import { DEFAULT_RASTER, layoutAtlas, selectKeys } from './atlas';
import { buildBMFont } from './bmfont';
import { safeFileName } from './formats';

const project = () => {
  const p = createBlankProject();
  p.glyphs['65'].bitmap[20] = 1;
  p.glyphs['65'].advance = 9;
  return p;
};

describe('atlas layout', () => {
  it('lays out a square-ish sheet with padding and scale', () => {
    const p = project();
    const l = layoutAtlas(p, { ...DEFAULT_RASTER, scale: 2, padding: 1 });
    expect(l.columns).toBe(Math.ceil(Math.sqrt(p.order.length)));
    expect(l.cellW).toBe(32);
    expect(l.cells[1].x).toBe(1 + 33);
    expect(l.width).toBe(1 + l.columns * 33);
    expect(l.cells[0].advance).toBe(16);
  });

  it('filters by scope', () => {
    const p = project();
    expect(selectKeys(p, 'nonEmpty')).toEqual(['65']);
    expect(selectKeys(p, 'all')).toHaveLength(p.order.length);
  });
});

describe('bmfont', () => {
  it('writes header and one line per glyph', () => {
    const p = project();
    const l = layoutAtlas(p, { ...DEFAULT_RASTER, scope: 'nonEmpty' });
    const fnt = buildBMFont(p, l, 'font.png').trim().split('\n');
    expect(fnt[0]).toMatch(/^info face="New font"/);
    expect(fnt[2]).toBe('page id=0 file="font.png"');
    expect(fnt[3]).toBe('chars count=1');
    expect(fnt[4]).toContain('char id=65 x=1 y=1 width=16 height=16 xoffset=-1');
    expect(fnt[4]).toContain('xadvance=8');
  });
});

describe('ttf', () => {
  it('produces a font opentype.js can read back', () => {
    const font = opentype.parse(buildFontArrayBuffer(project()));
    expect(font.charToGlyph('A').path.commands.length).toBeGreaterThan(0);
  });
});

describe('file names', () => {
  it('strips forbidden characters', () => {
    expect(safeFileName(' My: Font? ')).toBe('My_Font');
    expect(safeFileName('???')).toBe('font');
  });
});
