import { pushBounded, type DeletedGlyph, type EditorContext, type Enqueue } from './context';

type Ctx = EditorContext;

const topSeq = (stack: { seq: number }[] | undefined) => (stack?.length ? stack[stack.length - 1].seq : -1);

/** Removes a glyph and returns the record needed to bring it back. */
function remove(ctx: Ctx, key: string, seq: number): { next: Ctx; record: DeletedGlyph } | null {
  const glyph = ctx.glyphs[key];
  if (!glyph) return null;
  const glyphs = { ...ctx.glyphs };
  const undoStacks = { ...ctx.undoStacks };
  const redoStacks = { ...ctx.redoStacks };
  delete glyphs[key];
  delete undoStacks[key];
  delete redoStacks[key];
  const index = ctx.order.indexOf(key);
  const order = ctx.order.filter((k) => k !== key);
  const currentKey = ctx.currentKey === key ? (order[Math.min(index, order.length - 1)] ?? null) : ctx.currentKey;
  const record = { key, glyph, index, undo: ctx.undoStacks[key] ?? [], redo: ctx.redoStacks[key] ?? [], seq };
  return { next: { ...ctx, glyphs, order, undoStacks, redoStacks, currentKey, dirty: true }, record };
}

function restore(ctx: Ctx, d: DeletedGlyph): Ctx {
  const order = [...ctx.order];
  order.splice(Math.min(d.index, order.length), 0, d.key);
  return {
    ...ctx,
    glyphs: { ...ctx.glyphs, [d.key]: d.glyph },
    order,
    undoStacks: { ...ctx.undoStacks, [d.key]: d.undo },
    redoStacks: { ...ctx.redoStacks, [d.key]: d.redo },
    currentKey: d.key,
    dirty: true,
  };
}

/** Moves the top pixel step of the current glyph from one stack to the other. */
function travel(ctx: Ctx, from: 'undoStacks' | 'redoStacks'): Ctx {
  const key = ctx.currentKey;
  const g = key ? ctx.glyphs[key] : undefined;
  const stack = key ? ctx[from][key] : undefined;
  if (!key || !g || !stack?.length) return ctx;
  const to = from === 'undoStacks' ? 'redoStacks' : 'undoStacks';
  const step = stack[stack.length - 1];
  return {
    ...ctx,
    glyphs: { ...ctx.glyphs, [key]: { ...g, bitmap: new Uint8Array(step.bitmap), edited: true } },
    [from]: { ...ctx[from], [key]: stack.slice(0, -1) },
    [to]: { ...ctx[to], [key]: [...(ctx[to][key] ?? []), { bitmap: g.bitmap.slice(), seq: step.seq }] },
    dirty: true,
  };
}

/**
 * Undo/redo across pixel edits and glyph deletions: whichever of the two
 * happened last (highest `seq`) is undone or redone first.
 */
export const historyEvents = {
  deleteGlyph: (ctx: Ctx, e: { key: string }, enq: Enqueue) => {
    const seq = ctx.seq + 1;
    const res = remove(ctx, e.key, seq);
    if (!res) return ctx;
    enq.emit.notice({ key: 'toastGlyphDeleted', params: { char: res.record.glyph.char }, tone: 'info' });
    return { ...res.next, seq, deleted: pushBounded(ctx.deleted, res.record), restored: [] };
  },

  undo: (ctx: Ctx, _e: object, enq: Enqueue) => {
    const pixel = ctx.currentKey ? topSeq(ctx.undoStacks[ctx.currentKey]) : -1;
    const d = ctx.deleted[ctx.deleted.length - 1];
    if (!d || d.seq < pixel) return travel(ctx, 'undoStacks');
    enq.emit.notice({ key: 'toastGlyphRestored', params: { char: d.glyph.char }, tone: 'info' });
    return { ...restore(ctx, d), deleted: ctx.deleted.slice(0, -1), restored: [...ctx.restored, d] };
  },

  redo: (ctx: Ctx) => {
    const pixel = ctx.currentKey ? topSeq(ctx.redoStacks[ctx.currentKey]) : -1;
    const d = ctx.restored[ctx.restored.length - 1];
    if (!d || d.seq < pixel) return travel(ctx, 'redoStacks');
    const res = remove(ctx, d.key, d.seq);
    if (!res) return ctx;
    return { ...res.next, deleted: [...ctx.deleted, res.record], restored: ctx.restored.slice(0, -1) };
  },
};
