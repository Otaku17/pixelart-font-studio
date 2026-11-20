import { describe, expect, it } from 'vitest';
import { createActor, fromPromise, waitFor } from 'xstate';
import { exportMachine, type ExportSettings } from '../machines/export';
import { updateMachine } from '../machines/update';
import type { UpdateInfo } from '../services/updates';

const info = (available: boolean): UpdateInfo => ({ current: '1.0.1', version: 'v1.1.0', url: 'u', available });

function updateActorWith(result: UpdateInfo | Error) {
  const actor = createActor(
    updateMachine.provide({
      actors: {
        check: fromPromise(async () => {
          if (result instanceof Error) throw result;
          return result;
        }),
        download: fromPromise(async () => '/tmp/app.exe'),
        reveal: fromPromise(async () => {}),
      },
    }),
  );
  const notices: string[] = [];
  actor.on('notice', (n) => notices.push(n.key));
  return { actor: actor.start(), notices };
}

describe('update machine', () => {
  it('stays quiet at startup when up to date', async () => {
    const { actor, notices } = updateActorWith(info(false));
    actor.send({ type: 'CHECK', force: false });
    await waitFor(actor, (s) => s.matches('upToDate'));
    expect(notices).toEqual([]);
  });

  it('reports "up to date" and failures on a manual check only', async () => {
    const ok = updateActorWith(info(false));
    ok.actor.send({ type: 'CHECK', force: true });
    await waitFor(ok.actor, (s) => s.matches('upToDate'));
    expect(ok.notices).toEqual(['updateUnavailable']);

    const quiet = updateActorWith(new Error('offline'));
    quiet.actor.send({ type: 'CHECK', force: false });
    await waitFor(quiet.actor, (s) => s.matches('idle') && s.context.manual === false);
    expect(quiet.notices).toEqual([]);
  });

  it('downloads an available update', async () => {
    const { actor, notices } = updateActorWith(info(true));
    actor.send({ type: 'CHECK', force: false });
    await waitFor(actor, (s) => s.matches('available'));
    actor.send({ type: 'DOWNLOAD' });
    const done = await waitFor(actor, (s) => s.matches('downloaded'));
    expect(done.context.path).toBe('/tmp/app.exe');
    expect(notices).toEqual(['updateAvailable', 'updateDownloadedTo']);
  });
});

function exportActorWith(run: () => Promise<string[] | null>) {
  const saved: ExportSettings[] = [];
  const actor = createActor(
    exportMachine.provide({
      actors: { run: fromPromise(run) },
      actions: { saveSettings: (_, s) => saved.push(s) },
    }),
    { input: { format: 'bmfont' } },
  ).start();
  return { actor, saved };
}

describe('export machine', () => {
  it('returns to the options when the save dialog is cancelled', async () => {
    const { actor, saved } = exportActorWith(async () => null);
    actor.send({ type: 'OPEN' });
    actor.send({ type: 'SET_RASTER', patch: { scale: 3 } });
    actor.send({ type: 'EXPORT' });
    const s = await waitFor(actor, (x) => x.matches('editing'));
    expect(s.context.raster.scale).toBe(3);
    expect(saved).toEqual([]);
  });

  it('closes and remembers settings after a successful export', async () => {
    const { actor, saved } = exportActorWith(async () => ['Font.fnt', 'Font.png']);
    actor.send({ type: 'OPEN', format: 'atlas' });
    actor.send({ type: 'EXPORT' });
    await waitFor(actor, (x) => x.matches('closed'));
    expect(saved[0].format).toBe('atlas');
  });

  it('keeps the dialog open with a translated error', async () => {
    const { actor } = exportActorWith(async () => {
      throw Object.assign(new Error('x'), { key: 'exportErrorEmpty' });
    });
    actor.send({ type: 'OPEN' });
    actor.send({ type: 'EXPORT' });
    const s = await waitFor(actor, (x) => x.matches('editing') && x.context.error !== null);
    expect(s.context.error?.key).toBe('exportErrorEmpty');
  });
});
