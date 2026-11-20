import { DEFAULT_RASTER, loadFontIntoProject, parseFontFile, parseProject } from '@pfs/core';
import { editor } from '../state/editor/store';
import { notify } from './notices';
import { runExport } from './exporter';
import { pickFontFile, pickProjectFile } from './fileIO';

/** User commands shared by menus, buttons and keyboard shortcuts. */

export async function importFontFile() {
  const picked = await pickFontFile();
  if (!picked) return;
  try {
    const project = loadFontIntoProject(parseFontFile(picked.buffer), picked.name);
    editor.loadProject({
      project,
      notice: { key: 'toastImported', params: { size: project.metrics.nativeSize } },
    });
  } catch (err) {
    console.error(err);
    notify({ key: 'toastFontReadError', tone: 'danger' });
  }
}

export async function openProjectFile() {
  const text = await pickProjectFile();
  if (!text) return;
  try {
    editor.loadProject({ project: parseProject(text), notice: { key: 'toastProjectLoaded' } });
  } catch (err) {
    console.error(err);
    notify({ key: 'toastProjectLoadError', tone: 'danger' });
  }
}

/** Quick save (Ctrl+S): project format, no dialog options. */
export async function saveProject() {
  try {
    const written = await runExport('project', DEFAULT_RASTER);
    if (!written) return;
    editor.markSaved();
    notify({ key: 'toastProjectSaved' });
  } catch (err) {
    console.error(err);
    notify({ key: 'exportErrorGeneric', params: { message: String(err) }, tone: 'danger' });
  }
}

