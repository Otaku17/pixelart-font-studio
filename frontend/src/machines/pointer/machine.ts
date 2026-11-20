import type { Region } from '@pfs/core';
import { assign, setup } from 'xstate';
import { editor } from '../../state/editor/store';
import { inside, normalize, placedBounds, type Bounds, type Cell } from './geometry';
import * as ops from './ops';

export type PointerEvent =
  | ({ type: 'DOWN'; erase: boolean } & Cell)
  | ({ type: 'MOVE' } & Cell)
  | { type: 'UP' }
  | { type: 'RESET' }
  | { type: 'COPY' }
  | { type: 'CUT' }
  | { type: 'PASTE' }
  | { type: 'DELETE' };

export interface PointerContext {
  selection: Bounds | null;
  start: Cell | null;
  /** Bitmap the previews are drawn on (shape tools, moved selection). */
  base: Uint8Array | null;
  /** Bitmap before the gesture, pushed once to the undo history. */
  before: Uint8Array | null;
  value: 0 | 1;
  region: Region | null;
  offset: Cell;
}

const at = (e: PointerEvent): Cell => ('x' in e ? { x: e.x, y: e.y } : { x: 0, y: 0 });
const valueOf = (e: PointerEvent): 0 | 1 => (e.type === 'DOWN' && (e.erase || ops.current()?.tool === 'eraser') ? 0 : 1);
const moved = (c: PointerContext): Cell => ({
  x: (c.selection?.x0 ?? 0) + c.offset.x,
  y: (c.selection?.y0 ?? 0) + c.offset.y,
});

const idleContext = { start: null, base: null, before: null, region: null, offset: { x: 0, y: 0 } };

/**
 * Mouse gestures on the pixel canvas:
 * idle → painting | shaping | marquee | moving → idle (on UP).
 * Selection shortcuts (copy/cut/paste/delete) are events handled in idle.
 */
export const pointerMachine = setup({
  types: { context: {} as PointerContext, events: {} as PointerEvent },
  guards: {
    noGlyph: () => ops.current() === null,
    grabSelection: ({ context, event }) =>
      ops.current()?.tool === 'select' && !!context.selection && inside(at(event), context.selection),
    selectTool: () => ops.current()?.tool === 'select',
    freehand: ({ event }) => {
      const tool = ops.current()?.tool;
      return (event.type === 'DOWN' && event.erase) || tool === 'pencil' || tool === 'eraser';
    },
    bucket: () => ops.current()?.tool === 'bucket',
    hasSelection: ({ context }) => !!context.selection,
  },
}).createMachine({
  id: 'pointer',
  context: { selection: null, value: 1, ...idleContext },
  initial: 'idle',
  on: { RESET: { target: '.idle', actions: assign({ selection: null, ...idleContext }) } },
  states: {
    idle: {
      on: {
        DOWN: [
          { guard: 'noGlyph' },
          {
            guard: 'grabSelection',
            target: 'moving',
            actions: assign(({ context, event }) => {
              const lifted = ops.lift(context.selection!);
              return { start: at(event), base: lifted?.base ?? null, before: lifted?.before ?? null, region: lifted?.region ?? null, offset: { x: 0, y: 0 } };
            }),
          },
          {
            guard: 'selectTool',
            target: 'marquee',
            actions: assign(({ event }) => ({ start: at(event), selection: normalize(at(event), at(event)) })),
          },
          {
            guard: 'freehand',
            target: 'painting',
            actions: [
              assign(({ event }) => ({ before: ops.current()!.glyph.bitmap.slice(), value: valueOf(event) })),
              ({ event }) => ops.paint(at(event), valueOf(event)),
            ],
          },
          { guard: 'bucket', actions: ({ event }) => ops.fill(at(event), valueOf(event)) },
          {
            target: 'shaping',
            actions: assign(({ event }) => {
              const bitmap = ops.current()!.glyph.bitmap;
              return { start: at(event), base: bitmap.slice(), before: bitmap.slice(), value: valueOf(event) };
            }),
          },
        ],
        COPY: { guard: 'hasSelection', actions: ({ context }) => ops.copySelection(context.selection!) },
        CUT: {
          guard: 'hasSelection',
          actions: ({ context }) => {
            ops.copySelection(context.selection!);
            ops.clearSelection(context.selection!);
          },
        },
        PASTE: { actions: assign({ selection: ({ context }) => ops.pasteClipboard(context.selection) }) },
        DELETE: [
          { guard: 'hasSelection', actions: ({ context }) => ops.clearSelection(context.selection!) },
          { actions: () => editor.clearCurrent() },
        ],
      },
    },
    painting: {
      on: {
        MOVE: { actions: ({ context, event }) => ops.paint(at(event), context.value) },
        UP: { target: 'idle', actions: [({ context }) => ops.commitStroke(context.before), assign(idleContext)] },
      },
    },
    shaping: {
      on: {
        MOVE: { actions: ({ context, event }) => ops.previewShape(context.base!, context.start!, at(event), context.value) },
        UP: { target: 'idle', actions: [({ context }) => ops.commitStroke(context.before), assign(idleContext)] },
      },
    },
    marquee: {
      on: {
        MOVE: { actions: assign({ selection: ({ context, event }) => normalize(context.start!, at(event)) }) },
        UP: { target: 'idle', actions: assign(idleContext) },
      },
    },
    moving: {
      on: {
        MOVE: {
          actions: [
            assign({ offset: ({ context, event }) => ({ x: at(event).x - context.start!.x, y: at(event).y - context.start!.y }) }),
            ({ context }) => context.region && ops.previewMove(context.base!, context.region, moved(context)),
          ],
        },
        UP: {
          target: 'idle',
          actions: [
            ({ context }) => ops.commitStroke(context.before),
            assign(({ context }) => {
              const c = ops.current();
              const selection = c && context.region ? placedBounds(moved(context), context.region, c.w, c.h) : null;
              return { selection, ...idleContext };
            }),
          ],
        },
      },
    },
  },
});
