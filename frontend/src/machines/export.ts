import { DEFAULT_RASTER, type ExportFormat, type RasterOptions } from '@pfs/core';
import { assign, emit, fromPromise, setup } from 'xstate';
import type { TextKey } from '../i18n';
import type { Notice } from '../state/editor/context';

export type ExportEvent =
  | { type: 'OPEN'; format?: ExportFormat }
  | { type: 'CLOSE' }
  | { type: 'SET_FORMAT'; format: ExportFormat }
  | { type: 'SET_RASTER'; patch: Partial<RasterOptions> }
  | { type: 'EXPORT' };

export interface ExportContext {
  format: ExportFormat;
  raster: RasterOptions;
  error: { key: TextKey; params?: Record<string, string> } | null;
}

export interface ExportSettings {
  format: ExportFormat;
  raster: RasterOptions;
}

type RunOutput = string[] | null;

/**
 * closed → editing ⇄ exporting → closed
 * The `run` actor (save dialog + file writes) is provided by the app, so the
 * machine stays testable; `saveSettings` remembers the last choice.
 */
export const exportMachine = setup({
  types: {
    context: {} as ExportContext,
    events: {} as ExportEvent,
    input: {} as Partial<ExportSettings> | undefined,
    emitted: {} as { type: 'notice' } & Notice,
  },
  actors: {
    run: fromPromise<RunOutput, ExportSettings>(async () => null),
  },
  actions: {
    saveSettings: (_, _settings: ExportSettings) => {},
  },
}).createMachine({
  id: 'export',
  context: ({ input }) => ({
    format: input?.format ?? 'ttf',
    raster: { ...DEFAULT_RASTER, ...input?.raster },
    error: null,
  }),
  initial: 'closed',
  states: {
    closed: {
      on: {
        OPEN: {
          target: 'editing',
          actions: assign({
            format: ({ context, event }) => event.format ?? context.format,
            error: null,
          }),
        },
      },
    },
    editing: {
      on: {
        CLOSE: 'closed',
        SET_FORMAT: { actions: assign({ format: ({ event }) => event.format, error: null }) },
        SET_RASTER: {
          actions: assign({ raster: ({ context, event }) => ({ ...context.raster, ...event.patch }), error: null }),
        },
        EXPORT: 'exporting',
      },
    },
    exporting: {
      invoke: {
        src: 'run',
        input: ({ context }) => ({ format: context.format, raster: context.raster }),
        onDone: [
          // Save dialog cancelled: back to the options, nothing lost.
          { guard: ({ event }) => event.output === null, target: 'editing' },
          {
            target: 'closed',
            actions: [
              { type: 'saveSettings', params: ({ context }) => ({ format: context.format, raster: context.raster }) },
              emit(({ event }) => ({
                type: 'notice' as const,
                key: 'toastExported' as const,
                params: { files: (event.output ?? []).join(', ') },
              })),
            ],
          },
        ],
        onError: {
          target: 'editing',
          actions: assign({
            error: ({ event }) => {
              const err = event.error as { key?: TextKey; message?: string };
              return err?.key
                ? { key: err.key }
                : { key: 'exportErrorGeneric' as const, params: { message: String(err?.message ?? err) } };
            },
          }),
        },
      },
    },
  },
});
