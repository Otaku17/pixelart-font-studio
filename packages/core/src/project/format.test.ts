import { describe, expect, it } from 'vitest';
import { createBlankProject } from './defaults';
import { parseProject, stringifyProject } from './format';
import { bitmapToRows, rowsToBitmap } from './rows';

describe('rows', () => {
  it('round-trips a bitmap', () => {
    const bmp = new Uint8Array([1, 0, 0, 1, 1, 0]);
    expect(bitmapToRows(bmp, 3, 2)).toEqual(['#..', '##.']);
    expect(rowsToBitmap(['#..', '##.'], 3, 2)).toEqual(bmp);
  });

  it('tolerates short or missing rows', () => {
    expect(rowsToBitmap(['#'], 2, 2)).toEqual(new Uint8Array([1, 0, 0, 0]));
  });
});

describe('project format', () => {
  it('round-trips v2 with metrics and order', () => {
    const p = createBlankProject();
    p.metrics = { unitsPerEm: 2048, ascender: 1600, descender: -448, nativeSize: 8 };
    p.glyphs['65'].bitmap[17] = 1;
    p.glyphs['65'].edited = true;
    p.order = ['66', '65', ...p.order.slice(2)];
    const back = parseProject(stringifyProject(p));
    expect(back.metrics).toEqual(p.metrics);
    expect(back.order.slice(0, 2)).toEqual(['66', '65']);
    expect(back.glyphs['65'].bitmap).toEqual(p.glyphs['65'].bitmap);
    expect(back.glyphs['65'].edited).toBe(true);
  });

  it('reads legacy v1 files', () => {
    const v1 = {
      version: 1,
      fontName: 'Old',
      gridW: 2,
      gridH: 2,
      baselineRow: 1,
      glyphs: { '66': { char: 'B', advance: 2, bitmap: [0, 1, 1, 0] }, '65': { char: 'A', advance: 1, bitmap: [1] } },
    };
    const p = parseProject(JSON.stringify(v1));
    expect(p.fontName).toBe('Old');
    expect(p.order).toEqual(['65', '66']);
    expect(p.glyphs['65'].bitmap).toEqual(new Uint8Array([1, 0, 0, 0]));
  });

  it('rejects garbage', () => {
    expect(() => parseProject('{"hello":1}')).toThrow();
  });
});
