import type { Notice } from '../state/editor/context';
import { editorStore } from '../state/editor/store';

type Listener = (n: Notice) => void;
const listeners = new Set<Listener>();

/** Shows a toast from anywhere (commands, machines). */
export function notify(n: Notice) {
  listeners.forEach((l) => l(n));
}

/** Subscribes to every notice: store events plus `notify()` calls. */
export function onNotice(listener: Listener): () => void {
  listeners.add(listener);
  const sub = editorStore.on('notice', ({ type: _type, ...n }) => listener(n));
  return () => {
    listeners.delete(listener);
    sub.unsubscribe();
  };
}
