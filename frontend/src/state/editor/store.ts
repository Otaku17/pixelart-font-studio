import { createStore } from '@xstate/store';
import { useSelector } from '@xstate/store/react';
import { clipboardEvents } from './clipboardEvents';
import { initialContext, projectOf, type EditorContext, type Notice } from './context';
import { documentEvents } from './documentEvents';
import { drawEvents } from './drawEvents';
import { historyEvents } from './historyEvents';

/**
 * The open font document plus editor UI state, as an event-driven
 * XState store: components send events, handlers return the next context.
 */
export const editorStore = createStore({
  context: initialContext(),
  emits: {
    notice: (_: Notice) => {},
  },
  on: {
    ...documentEvents,
    ...drawEvents,
    ...historyEvents,
    ...clipboardEvents,
  },
});

export const editor = editorStore.trigger;

export function getEditor(): EditorContext {
  return editorStore.getSnapshot().context;
}

export function getProject() {
  return projectOf(getEditor());
}

export function useEditor<T>(select: (ctx: EditorContext) => T): T {
  return useSelector(editorStore, (s) => select(s.context));
}

export function useCurrentGlyph() {
  return useEditor((c) => (c.currentKey ? (c.glyphs[c.currentKey] ?? null) : null));
}

export type { EditorContext, Notice, Tool } from './context';
