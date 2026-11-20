// Unified file IO: native Wails dialogs/filesystem inside the desktop shell,
// browser upload/download when running in a plain browser (`npm run dev`).
import type { ExportFile } from '@pfs/core';
import * as Go from '../../wailsjs/go/backend/App';
import { t } from '../state/prefs';

export function isDesktop(): boolean {
  return typeof window !== 'undefined' && !!(window as { go?: unknown }).go;
}

/** Splits "C:\\dir\\Font.fnt" into dir ("C:\\dir\\"), stem ("Font") and ext ("fnt"). */
export function splitPath(path: string) {
  const cut = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1;
  const file = path.slice(cut);
  const dot = file.lastIndexOf('.');
  return {
    dir: path.slice(0, cut),
    stem: dot > 0 ? file.slice(0, dot) : file,
    ext: dot > 0 ? file.slice(dot + 1).toLowerCase() : '',
  };
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function browserDownload(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function browserPickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

export async function pickFontFile(): Promise<{ name: string; buffer: ArrayBuffer } | null> {
  if (isDesktop()) {
    const path = await Go.OpenDialog(t('dialogOpenFont'), `${t('fontFiles')} (*.ttf;*.otf;*.woff)`, '*.ttf;*.otf;*.woff');
    if (!path) return null;
    const bytes = base64ToBytes(await Go.ReadFileBase64(path));
    return { name: splitPath(path).stem, buffer: bytes.buffer };
  }
  const file = await browserPickFile('.ttf,.otf,.woff');
  return file ? { name: splitPath(file.name).stem, buffer: await file.arrayBuffer() } : null;
}

export async function pickProjectFile(): Promise<string | null> {
  if (isDesktop()) {
    const path = await Go.OpenDialog(t('dialogOpenProject'), `${t('projectFiles')} (*.json)`, '*.json');
    return path ? Go.ReadFileText(path) : null;
  }
  const file = await browserPickFile('.json');
  return file ? file.text() : null;
}

/**
 * Asks where to save. Returns the chosen path (desktop) or the default name
 * (browser, where the download prompt decides), or null when cancelled.
 */
export async function pickSavePath(defaultName: string, filterName: string, ext: string): Promise<string | null> {
  if (!isDesktop()) return defaultName;
  const path = await Go.SaveDialog(t('dialogSave'), defaultName, `${filterName} (*.${ext})`, `*.${ext}`);
  if (!path) return null;
  // Some dialogs drop the extension when the user types a bare name.
  return splitPath(path).ext === ext ? path : `${path}.${ext}`;
}

/** Writes every file into `dir` (desktop) or downloads them (browser). */
export async function writeFiles(dir: string, files: ExportFile[]): Promise<void> {
  for (const f of files) {
    if (!isDesktop()) {
      const data = f.encoding === 'base64' ? base64ToBytes(f.data) : f.data;
      browserDownload(f.name, new Blob([data]));
    } else if (f.encoding === 'base64') {
      await Go.WriteFileBase64(dir + f.name, f.data);
    } else {
      await Go.WriteFileText(dir + f.name, f.data);
    }
  }
}
