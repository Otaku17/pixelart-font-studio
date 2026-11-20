import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { pointerMachine } from '../machines/pointer/machine';
import { editor, getEditor } from '../state/editor/store';

const bitmap = () => getEditor().glyphs[getEditor().currentKey!].bitmap;
const w = () => getEditor().gridW;

describe('editor store + pointer machine', () => {
  it('records one undo step per pencil stroke, per glyph', () => {
    editor.newProject();
    editor.setTool({ tool: 'pencil' });
    const pointer = createActor(pointerMachine).start();
    pointer.send({ type: 'DOWN', x: 1, y: 1, erase: false });
    pointer.send({ type: 'MOVE', x: 2, y: 1 });
    pointer.send({ type: 'UP' });
    expect(bitmap()[w() + 1]).toBe(1);
    expect(bitmap()[w() + 2]).toBe(1);
    expect(getEditor().dirty).toBe(true);

    editor.undo();
    expect(bitmap().some(Boolean)).toBe(false);
    editor.redo();
    expect(bitmap()[w() + 2]).toBe(1);
  });

  it('moves a selection and keeps it selected', () => {
    editor.newProject();
    editor.setTool({ tool: 'pencil' });
    const pointer = createActor(pointerMachine).start();
    pointer.send({ type: 'DOWN', x: 0, y: 0, erase: false });
    pointer.send({ type: 'UP' });

    editor.setTool({ tool: 'select' });
    pointer.send({ type: 'DOWN', x: 0, y: 0, erase: false });
    pointer.send({ type: 'MOVE', x: 1, y: 0 });
    pointer.send({ type: 'UP' });
    pointer.send({ type: 'DOWN', x: 0, y: 0, erase: false });
    pointer.send({ type: 'MOVE', x: 3, y: 2 });
    pointer.send({ type: 'UP' });

    expect(bitmap()[0]).toBe(0);
    expect(bitmap()[2 * w() + 3]).toBe(1);
    expect(pointer.getSnapshot().context.selection).toEqual({ x0: 3, y0: 2, x1: 4, y1: 2 });
  });
});

describe('glyph deletion history', () => {
  it('undoes and redoes a deletion in chronological order with pixel edits', () => {
    editor.newProject();
    editor.selectGlyph({ key: '66' });
    const before = getEditor().glyphs['66'].bitmap.slice();
    const after = before.slice();
    after[0] = 1;
    editor.commitBitmap({ key: '66', before, after });
    editor.deleteGlyph({ key: '66' });
    expect(getEditor().glyphs['66']).toBeUndefined();

    editor.undo(); // brings B back, with its drawing and position
    expect(getEditor().order[1]).toBe('66');
    expect(getEditor().currentKey).toBe('66');
    expect(getEditor().glyphs['66'].bitmap[0]).toBe(1);

    editor.undo(); // then undoes the pixel edit made before the deletion
    expect(getEditor().glyphs['66'].bitmap[0]).toBe(0);

    editor.redo();
    editor.redo(); // deletes B again
    expect(getEditor().glyphs['66']).toBeUndefined();
  });
});
