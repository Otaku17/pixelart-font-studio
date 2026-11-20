import { charFromCodepoint, createBlankProject, makeGlyph, sortKeys, type Project } from '@pfs/core';
import { withProject, ZOOM_MAX, ZOOM_MIN, type EditorContext, type Enqueue, type Notice, type Tool } from './context';

type Ctx = EditorContext;

/** Document-level events: project lifecycle, glyph set, selection, view. */
export const documentEvents = {
  newProject: (ctx: Ctx, _e: object, enq: Enqueue) => {
    enq.emit.notice({ key: 'toastNewProject' });
    return withProject(ctx, createBlankProject());
  },

  loadProject: (ctx: Ctx, e: { project: Project; notice?: Notice }, enq: Enqueue) => {
    if (e.notice) enq.emit.notice(e.notice);
    return withProject(ctx, e.project);
  },

  markSaved: (ctx: Ctx) => ({ ...ctx, dirty: false }),

  setFontName: (ctx: Ctx, e: { name: string }) =>
    e.name === ctx.fontName ? ctx : { ...ctx, fontName: e.name, dirty: true },

  /** Creates a glyph silently if missing (used by the text preview). */
  ensureGlyph: (ctx: Ctx, e: { cp: number; char?: string }) => {
    const key = String(e.cp);
    if (ctx.glyphs[key]) return ctx;
    const glyph = makeGlyph(ctx.gridW, ctx.gridH, e.char || charFromCodepoint(e.cp));
    return { ...ctx, glyphs: { ...ctx.glyphs, [key]: glyph }, order: [...ctx.order, key] };
  },

  addGlyph: (ctx: Ctx, e: { char: string }) => {
    const cp = e.char.codePointAt(0);
    if (cp === undefined) return ctx;
    const key = String(cp);
    if (ctx.glyphs[key]) return { ...ctx, currentKey: key };
    return {
      ...ctx,
      glyphs: { ...ctx.glyphs, [key]: makeGlyph(ctx.gridW, ctx.gridH, e.char) },
      order: sortKeys([...ctx.order, key]),
      currentKey: key,
      dirty: true,
    };
  },

  selectGlyph: (ctx: Ctx, e: { key: string }) => ({ ...ctx, currentKey: e.key }),

  setTool: (ctx: Ctx, e: { tool: Tool }) => ({ ...ctx, tool: e.tool }),

  setZoom: (ctx: Ctx, e: { zoom: number }) => ({
    ...ctx,
    zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, e.zoom)),
  }),

  setAdvance: (ctx: Ctx, e: { value: number }) => {
    const g = ctx.currentKey ? ctx.glyphs[ctx.currentKey] : undefined;
    if (!g || !ctx.currentKey) return ctx;
    return {
      ...ctx,
      glyphs: { ...ctx.glyphs, [ctx.currentKey]: { ...g, advance: e.value } },
      dirty: true,
    };
  },
};
