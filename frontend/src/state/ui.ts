import { createStore } from '@xstate/store';
import { useSelector } from '@xstate/store/react';

export type Dialog = 'prefs' | 'shortcuts' | 'fullGrid' | null;

/** Which secondary window is open (the export dialog has its own machine). */
export const uiStore = createStore({
  context: { dialog: null as Dialog },
  on: {
    open: (ctx, e: { dialog: Exclude<Dialog, null> }) => ({ ...ctx, dialog: e.dialog }),
    close: (ctx) => ({ ...ctx, dialog: null }),
  },
});

export const ui = uiStore.trigger;

export function useDialog(): Dialog {
  return useSelector(uiStore, (s) => s.context.dialog);
}
