import { clearRegion, drawLine, drawRect, extractRegion, floodFill, pasteRegion, setPixel } from '@pfs/core';
import { editor, getEditor } from '../../state/editor/store';
import type { Bounds, Cell } from './geometry';
import { placedBounds } from './geometry';

/** Store-side effects of the pointer machine, kept apart from the statechart. */

export function current() {
  const ctx = getEditor();
  const key = ctx.currentKey;
  const glyph = key ? ctx.glyphs[key] : undefined;
  return glyph && key ? { key, glyph, w: ctx.gridW, h: ctx.gridH, tool: ctx.tool, clipboard: ctx.clipboard } : null;
}

export function paint(at: Cell, value: 0 | 1) {
  const c = current();
  if (!c) return;
  const next = c.glyph.bitmap.slice();
  setPixel(next, at.x, at.y, c.w, c.h, value);
  editor.setBitmapLive({ key: c.key, bitmap: next });
}

export function fill(at: Cell, value: 0 | 1) {
  const c = current();
  if (!c) return;
  const after = c.glyph.bitmap.slice();
  floodFill(after, at.x, at.y, c.w, c.h, after[at.y * c.w + at.x], value);
  editor.commitBitmap({ key: c.key, before: c.glyph.bitmap.slice(), after });
}

export function previewShape(base: Uint8Array, from: Cell, to: Cell, value: 0 | 1) {
  const c = current();
  if (!c) return;
  const preview = base.slice();
  const draw = c.tool === 'rect' ? drawRect : drawLine;
  draw(preview, from.x, from.y, to.x, to.y, c.w, c.h, value);
  editor.setBitmapLive({ key: c.key, bitmap: preview });
}

/** Records the stroke made since `before` as one undo step. */
export function commitStroke(before: Uint8Array | null) {
  const c = current();
  if (!c || !before) return;
  editor.commitBitmap({ key: c.key, before, after: c.glyph.bitmap });
}

/** Lifts the selected pixels: returns them plus the bitmap without them. */
export function lift(sel: Bounds) {
  const c = current();
  if (!c) return null;
  const region = extractRegion(c.glyph.bitmap, c.w, c.h, sel.x0, sel.y0, sel.x1, sel.y1);
  const base = c.glyph.bitmap.slice();
  clearRegion(base, c.w, c.h, sel.x0, sel.y0, sel.x1, sel.y1);
  return { region, base, before: c.glyph.bitmap.slice() };
}

export function previewMove(base: Uint8Array, region: ReturnType<typeof extractRegion>, at: Cell) {
  const c = current();
  if (!c) return;
  const preview = base.slice();
  pasteRegion(preview, c.w, c.h, region, at.x, at.y);
  editor.setBitmapLive({ key: c.key, bitmap: preview });
}

export function copySelection(sel: Bounds) {
  const c = current();
  if (c) editor.setClipboard({ region: extractRegion(c.glyph.bitmap, c.w, c.h, sel.x0, sel.y0, sel.x1, sel.y1) });
}

export function clearSelection(sel: Bounds) {
  const c = current();
  if (!c) return;
  const after = c.glyph.bitmap.slice();
  clearRegion(after, c.w, c.h, sel.x0, sel.y0, sel.x1, sel.y1);
  editor.commitBitmap({ key: c.key, before: c.glyph.bitmap.slice(), after });
}

/** Pastes the clipboard at the selection corner (or 0,0); returns the new selection. */
export function pasteClipboard(sel: Bounds | null): Bounds | null {
  const c = current();
  if (!c || !c.clipboard) return sel;
  const at = { x: sel?.x0 ?? 0, y: sel?.y0 ?? 0 };
  const after = c.glyph.bitmap.slice();
  pasteRegion(after, c.w, c.h, c.clipboard, at.x, at.y);
  editor.commitBitmap({ key: c.key, before: c.glyph.bitmap.slice(), after });
  return placedBounds(at, c.clipboard, c.w, c.h);
}
