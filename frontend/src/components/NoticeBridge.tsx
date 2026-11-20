import { useEffect } from 'react';
import { useToast } from 'soft-dark-ui';
import { updateActor } from '../machines/update';
import { exportActor } from '../services/exportActor';
import { onNotice } from '../services/notices';
import { t } from '../state/prefs';
import type { Notice } from '../state/editor/context';

/** Turns notices from stores, machines and commands into Soft Dark UI toasts. */
export function NoticeBridge() {
  const toast = useToast();

  useEffect(() => {
    const show = (n: Notice) => toast(t(n.key, n.params), n.tone ?? 'success');
    const off = onNotice(show);
    const subs = [updateActor.on('notice', show), exportActor.on('notice', show)];
    return () => {
      off();
      subs.forEach((s) => s.unsubscribe());
    };
  }, [toast]);

  return null;
}
