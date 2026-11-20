import { assign, createActor, emit, fromPromise, setup } from 'xstate';
import type { Notice } from '../state/editor/context';
import { checkForUpdates, downloadUpdate, revealInFolder, type UpdateInfo } from '../services/updates';

export type UpdateEvent =
  /** force = manual click: bypasses the 24 h cache and reports "up to date". */
  | { type: 'CHECK'; force: boolean }
  | { type: 'DOWNLOAD' }
  | { type: 'REVEAL' };

export interface UpdateContext {
  info: UpdateInfo | null;
  path: string | null;
  manual: boolean;
}

/**
 * idle → checking → upToDate | available | failed
 * available → downloading → downloaded (→ reveal in folder) | available
 * Nothing runs on its own: every step is triggered by an event.
 */
export const updateMachine = setup({
  types: {
    context: {} as UpdateContext,
    events: {} as UpdateEvent,
    emitted: {} as { type: 'notice' } & Notice,
  },
  actors: {
    check: fromPromise<UpdateInfo, { force: boolean }>(({ input }) => checkForUpdates(input.force)),
    download: fromPromise<string, { url: string }>(({ input }) => downloadUpdate(input.url)),
    reveal: fromPromise<void, { path: string }>(({ input }) => revealInFolder(input.path)),
  },
  guards: {
    isManual: ({ context }) => context.manual,
  },
}).createMachine({
  id: 'update',
  context: { info: null, path: null, manual: false },
  initial: 'idle',
  on: {
    CHECK: { target: '.checking', actions: assign({ manual: ({ event }) => event.force }) },
  },
  states: {
    idle: {},
    checking: {
      invoke: {
        src: 'check',
        input: ({ context }) => ({ force: context.manual }),
        onDone: [
          {
            guard: ({ event }) => event.output.available,
            target: 'available',
            actions: [
              assign({ info: ({ event }) => event.output }),
              emit(({ event }) => ({ type: 'notice' as const, key: 'updateAvailable' as const, params: { version: event.output.version }, tone: 'info' as const })),
            ],
          },
          {
            target: 'upToDate',
            actions: [
              assign({ info: ({ event }) => event.output }),
              emit({ type: 'notice', key: 'updateUnavailable', tone: 'info' }),
            ],
            // Only a manual check reports "nothing new"; the startup check stays quiet.
            guard: 'isManual',
          },
          { target: 'upToDate', actions: assign({ info: ({ event }) => event.output }) },
        ],
        onError: [
          { guard: 'isManual', target: 'failed', actions: emit({ type: 'notice', key: 'updateCheckFailed', tone: 'danger' }) },
          { target: 'idle' },
        ],
      },
    },
    upToDate: {},
    failed: {},
    available: {
      on: { DOWNLOAD: 'downloading' },
    },
    downloading: {
      on: { CHECK: {} },
      invoke: {
        src: 'download',
        input: ({ context }) => ({ url: context.info?.url ?? '' }),
        onDone: {
          target: 'downloaded',
          actions: [
            assign({ path: ({ event }) => event.output }),
            emit(({ event }) => ({ type: 'notice' as const, key: 'updateDownloadedTo' as const, params: { path: event.output } })),
          ],
        },
        onError: {
          target: 'available',
          actions: emit({ type: 'notice', key: 'updateDownloadFailed', tone: 'danger' }),
        },
      },
    },
    downloaded: {
      on: { REVEAL: 'revealing' },
    },
    revealing: {
      invoke: {
        src: 'reveal',
        input: ({ context }) => ({ path: context.path ?? '' }),
        onDone: 'downloaded',
        onError: 'downloaded',
      },
    },
  },
});

/** App-wide update actor. It idles until the startup check or a click. */
export const updateActor = createActor(updateMachine).start();
