import { useSelector } from '@xstate/react';
import { Button, Icon, Spinner } from 'soft-dark-ui';
import { updateActor } from '../../machines/update';
import { useDict } from '../../state/prefs';
import { format } from '../../i18n';

/** Menu bar update control; its label follows the update machine state. */
export function UpdateButton() {
  const t = useDict();
  const state = useSelector(updateActor, (s) => s.value);
  const version = useSelector(updateActor, (s) => s.context.info?.version ?? '');

  if (state === 'checking' || state === 'downloading' || state === 'revealing') {
    return (
      <Button variant="ghost" size="sm" disabled icon={<Spinner size="sm" />}>
        {state === 'downloading' ? t.updateDownloading : t.updateChecking}
      </Button>
    );
  }
  if (state === 'available') {
    return (
      <Button variant="primary" size="sm" icon={<Icon name="download" />} onClick={() => updateActor.send({ type: 'DOWNLOAD' })}>
        {format(t.updateInstall, { version })}
      </Button>
    );
  }
  if (state === 'downloaded') {
    return (
      <Button variant="secondary" size="sm" icon={<Icon name="folder" />} onClick={() => updateActor.send({ type: 'REVEAL' })}>
        {t.updateReveal}
      </Button>
    );
  }
  return (
    <Button variant="ghost" size="sm" icon={<Icon name="sync" />} onClick={() => updateActor.send({ type: 'CHECK', force: true })}>
      {t.updateButton}
    </Button>
  );
}
