import { createActor, fromPromise } from 'xstate';
import { exportMachine } from '../machines/export';
import { editor } from '../state/editor/store';
import { runExport } from './exporter';
import { loadExportSettings, saveExportSettings } from './exportSettings';

/** App-wide export dialog actor, wired to the real save dialog and disk. */
export const exportActor = createActor(
  exportMachine.provide({
    actors: {
      run: fromPromise(async ({ input }) => {
        const written = await runExport(input.format, input.raster);
        if (written && input.format === 'project') editor.markSaved();
        return written;
      }),
    },
    actions: {
      saveSettings: (_, settings) => saveExportSettings(settings),
    },
  }),
  { input: loadExportSettings() },
).start();
