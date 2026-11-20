import { createBlankProject, type Glyph, type Project, type Region } from '@pfs/core';
import type { TextKey } from '../../i18n';

export type Tool = 'pencil' | 'eraser' | 'bucket' | 'line' | 'rect' | 'select';

/** A user-facing message; translated by the UI, not by the store. */
export interface Notice {
  key: TextKey;
  params?: Record<string, string | number>;
  tone?: 'success' | 'info' | 'danger';
}

/** What store handlers may enqueue (structural subset of @xstate/store's EnqueueObject). */
export interface Enqueue {
  emit: { notice: (n: Notice) => void };
  effect: (fn: () => void) => void;
}

/** One pixel-history step. `seq` orders it against glyph deletions. */
export interface HistoryEntry {
  bitmap: Uint8Array;
  seq: number;
}

/** A deleted glyph, kept whole (with its own history) so Ctrl+Z can bring it back. */
export interface DeletedGlyph {
  key: string;
  glyph: Glyph;
  index: number;
  undo: HistoryEntry[];
  redo: HistoryEntry[];
  seq: number;
}

export interface EditorContext extends Project {
  currentKey: string | null;
  tool: Tool;
  zoom: number;
  /** Per-glyph pixel history: undo/redo touches the current glyph… */
  undoStacks: Record<string, HistoryEntry[]>;
  redoStacks: Record<string, HistoryEntry[]>;
  /** …or brings back / re-deletes a glyph, whichever happened last. */
  deleted: DeletedGlyph[];
  restored: DeletedGlyph[];
  /** Increments on every recorded action. */
  seq: number;
  /** Shared by the selection tool (regions) and "copy glyph" (whole glyphs). */
  clipboard: (Region & { advance?: number }) | null;
  /** Changes since the last save or load. */
  dirty: boolean;
}

export const UNDO_LIMIT = 50;
export const ZOOM_MIN = 6;
export const ZOOM_MAX = 40;

/** Replaces the document, keeping UI state (tool, zoom, clipboard). */
export function withProject(ctx: EditorContext, p: Project): EditorContext {
  return {
    ...ctx,
    ...p,
    currentKey: p.order[0] ?? null,
    undoStacks: {},
    redoStacks: {},
    deleted: [],
    restored: [],
    dirty: false,
  };
}

export function initialContext(): EditorContext {
  const base: EditorContext = {
    ...createBlankProject(),
    currentKey: null,
    tool: 'pencil',
    zoom: 20,
    undoStacks: {},
    redoStacks: {},
    deleted: [],
    restored: [],
    seq: 0,
    clipboard: null,
    dirty: false,
  };
  return withProject(base, base);
}

export function projectOf(ctx: EditorContext): Project {
  const { fontName, gridW, gridH, baselineRow, metrics, glyphs, order } = ctx;
  return { fontName, gridW, gridH, baselineRow, metrics, glyphs, order };
}

export function pushBounded<T>(stack: T[] | undefined, item: T): T[] {
  const next = [...(stack ?? []), item];
  if (next.length > UNDO_LIMIT) next.shift();
  return next;
}

/** Records `before` as the next undo step of `key`; a new action clears every redo. */
export function recordStep(ctx: EditorContext, key: string, before: Uint8Array): Partial<EditorContext> {
  const seq = ctx.seq + 1;
  return {
    seq,
    undoStacks: { ...ctx.undoStacks, [key]: pushBounded(ctx.undoStacks[key], { bitmap: before, seq }) },
    redoStacks: { ...ctx.redoStacks, [key]: [] },
    restored: [],
  };
}
