import { useEffect } from 'react';
import type { ActorRefFrom } from 'xstate';
import type { pointerMachine } from '../../machines/pointer/machine';
import { exportActor } from '../../services/exportActor';
import { editor, getEditor } from '../../state/editor/store';
import { uiStore } from '../../state/ui';
import { TOOL_KEYS } from './EditorToolbar';

type PointerRef = ActorRefFrom<typeof pointerMachine>;

function blocked(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  if (el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)) return true;
  return uiStore.getSnapshot().context.dialog !== null || exportActor.getSnapshot().value !== 'closed';
}

/** Tool letters plus the Select tool's copy / cut / paste / delete / escape. */
export function useCanvasShortcuts(pointer: PointerRef) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (blocked(e)) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (!mod && !e.altKey && TOOL_KEYS[key]) {
        editor.setTool({ tool: TOOL_KEYS[key] });
        return;
      }
      if (getEditor().tool !== 'select') return;

      if (e.key === 'Escape') pointer.send({ type: 'RESET' });
      else if (mod && key === 'c') pointer.send({ type: 'COPY' });
      else if (mod && key === 'x') pointer.send({ type: 'CUT' });
      else if (mod && key === 'v') pointer.send({ type: 'PASTE' });
      else if (e.key === 'Delete' || e.key === 'Backspace') pointer.send({ type: 'DELETE' });
      else return;
      e.preventDefault();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [pointer]);
}
