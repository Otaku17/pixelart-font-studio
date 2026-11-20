import { useEffect } from 'react';
import { exportActor } from '../services/exportActor';
import { openProjectFile, saveProject } from '../services/commands';
import { editor, getEditor } from '../state/editor/store';
import { uiStore } from '../state/ui';

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable);
}

/** App-wide keyboard shortcuts (selection shortcuts live in the canvas). */
export function useGlobalShortcuts() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform?.toLowerCase().includes('mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();
      const modalOpen = uiStore.getSnapshot().context.dialog !== null || exportActor.getSnapshot().value !== 'closed';

      if (mod && key === 's') {
        e.preventDefault();
        void saveProject();
      } else if (mod && key === 'e') {
        e.preventDefault();
        exportActor.send({ type: 'OPEN' });
      } else if (mod && key === 'o') {
        e.preventDefault();
        void openProjectFile();
      } else if (modalOpen || isTyping(e.target)) {
        return;
      } else if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
      } else if (mod && key === 'y') {
        e.preventDefault();
        editor.redo();
      } else if (e.key === 'Delete' && getEditor().tool !== 'select') {
        // With the Select tool, the canvas clears the selection instead.
        e.preventDefault();
        editor.clearCurrent();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
