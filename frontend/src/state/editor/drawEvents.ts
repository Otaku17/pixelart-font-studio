import { TRANSFORMS, type TransformName } from '@pfs/core';
import { recordStep, type EditorContext, type Enqueue } from './context';

type Ctx = EditorContext;

function commit(ctx: Ctx, key: string, before: Uint8Array, after: Uint8Array): Ctx {
  const g = ctx.glyphs[key];
  if (!g) return ctx;
  return {
    ...ctx,
    glyphs: { ...ctx.glyphs, [key]: { ...g, bitmap: after, edited: true } },
    ...recordStep(ctx, key, before),
    dirty: true,
  };
}

/** Pixel edits (undo/redo live in historyEvents). */
export const drawEvents = {
  /** Live preview while dragging; not recorded in history. */
  setBitmapLive: (ctx: Ctx, e: { key: string; bitmap: Uint8Array }) => {
    const g = ctx.glyphs[e.key];
    if (!g) return ctx;
    return { ...ctx, glyphs: { ...ctx.glyphs, [e.key]: { ...g, bitmap: e.bitmap } } };
  },

  commitBitmap: (ctx: Ctx, e: { key: string; before: Uint8Array; after: Uint8Array }) =>
    commit(ctx, e.key, e.before, e.after),

  transformCurrent: (ctx: Ctx, e: { name: TransformName }, enq: Enqueue) => {
    const g = ctx.currentKey ? ctx.glyphs[ctx.currentKey] : undefined;
    if (!g || !ctx.currentKey) {
      enq.emit.notice({ key: 'noGlyphSelected', tone: 'info' });
      return ctx;
    }
    const after = TRANSFORMS[e.name](g.bitmap, ctx.gridW, ctx.gridH);
    return commit(ctx, ctx.currentKey, g.bitmap.slice(), after);
  },

  clearCurrent: (ctx: Ctx, _e: object, enq: Enqueue) => {
    const g = ctx.currentKey ? ctx.glyphs[ctx.currentKey] : undefined;
    if (!g || !ctx.currentKey) {
      enq.emit.notice({ key: 'noGlyphSelected', tone: 'info' });
      return ctx;
    }
    return commit(ctx, ctx.currentKey, g.bitmap.slice(), new Uint8Array(ctx.gridW * ctx.gridH));
  },
};
