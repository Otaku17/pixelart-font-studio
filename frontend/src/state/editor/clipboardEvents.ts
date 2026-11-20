import { blankBitmap, pasteRegion, sortKeys, type Region } from '@pfs/core';
import { recordStep, type EditorContext, type Enqueue } from './context';

type Ctx = EditorContext;

/** Region and whole-glyph clipboard. */
export const clipboardEvents = {
  setClipboard: (ctx: Ctx, e: { region: Region }, enq: Enqueue) => {
    enq.emit.notice({ key: 'toastSelectionCopied' });
    return { ...ctx, clipboard: e.region };
  },

  copyGlyph: (ctx: Ctx, e: { key: string }, enq: Enqueue) => {
    const g = ctx.glyphs[e.key];
    if (!g) return ctx;
    enq.emit.notice({ key: 'toastGlyphCopied' });
    return {
      ...ctx,
      clipboard: { bitmap: g.bitmap.slice(), w: ctx.gridW, h: ctx.gridH, advance: g.advance },
    };
  },

  /** Pastes the clipboard into the glyph for `char`, creating it if needed. */
  pasteAsNewGlyph: (ctx: Ctx, e: { char: string }, enq: Enqueue) => {
    const clip = ctx.clipboard;
    if (!clip) {
      enq.emit.notice({ key: 'toastClipboardEmpty', tone: 'info' });
      return ctx;
    }
    const cp = e.char.codePointAt(0);
    if (cp === undefined) return ctx;
    const key = String(cp);
    const existing = ctx.glyphs[key];
    const base = existing ? existing.bitmap.slice() : blankBitmap(ctx.gridW, ctx.gridH);
    const after = base.slice();
    pasteRegion(after, ctx.gridW, ctx.gridH, clip, 0, 0);

    enq.emit.notice({ key: 'toastGlyphPasted' });
    return {
      ...ctx,
      glyphs: {
        ...ctx.glyphs,
        [key]: {
          bitmap: after,
          advance: clip.advance ?? existing?.advance ?? ctx.gridW,
          char: existing?.char ?? e.char,
          edited: true,
          sourceRasterized: false,
        },
      },
      order: existing ? ctx.order : sortKeys([...ctx.order, key]),
      currentKey: key,
      ...recordStep(ctx, key, base),
      dirty: true,
    };
  },
};
