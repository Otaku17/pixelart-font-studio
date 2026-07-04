import { useEditorStore } from '../state/store';
import { I18N } from './i18n';
import {
  pickFontFile,
  pickProjectFile,
  saveTextFile,
  saveBase64File,
} from './fileIO';
import { parseFontFile, loadFontIntoProject } from './font/rasterize';
import { buildTTFArrayBuffer } from './font/exportTTF';
import {
  renderGlyphCanvas,
  renderAtlasCanvas,
  canvasToPngBase64,
} from './renderPng';
import type { ProjectJSON } from '../types';
import * as AppBindings from '../../wailsjs/go/main/App';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function importFontFile() {
  const picked = await pickFontFile();
  if (!picked) return;
  try {
    const font = await parseFontFile(picked.buffer);
    const loaded = loadFontIntoProject(
      font,
      picked.name.replace(/\.[^.]+$/, ''),
    );
    useEditorStore.getState().loadFontProject(loaded);
  } catch (err) {
    console.error(err);
    useEditorStore
      .getState()
      .showToast(I18N[useEditorStore.getState().lang].toastFontReadError);
  }
}

export async function openProjectFile() {
  const text = await pickProjectFile();
  if (!text) return;
  try {
    const payload = JSON.parse(text) as ProjectJSON;
    if (!payload || !payload.glyphs) throw new Error('Invalid project');
    useEditorStore.getState().loadProjectJSON(payload);
  } catch (err) {
    console.error(err);
    useEditorStore
      .getState()
      .showToast(I18N[useEditorStore.getState().lang].toastProjectLoadError);
  }
}

export async function exportProjectJSON() {
  const st = useEditorStore.getState();
  const payload: ProjectJSON = {
    version: 1,
    fontName: st.fontName,
    gridW: st.gridW,
    gridH: st.gridH,
    baselineRow: st.baselineRow,
    glyphs: {},
  };
  for (const key of st.order) {
    const g = st.glyphs[key];
    if (!g) continue;
    payload.glyphs[key] = {
      char: g.char,
      advance: g.advance,
      bitmap: Array.from(g.bitmap),
      edited: g.edited,
      sourceRasterized: g.sourceRasterized,
    };
  }
  const filename = `${st.fontName.replace(/\s+/g, '_') || 'font'}_project.json`;
  await saveTextFile(
    filename,
    JSON.stringify(payload, null, 2),
    'Projet JSON',
    '*.json',
  );
}

export async function exportGlyphPNG() {
  const st = useEditorStore.getState();
  const key = st.currentKey;
  const g = key ? st.glyphs[key] : null;
  if (!g) {
    st.showToast(I18N[st.lang].noGlyphSelected);
    return;
  }
  const canvas = renderGlyphCanvas(g.bitmap, st.gridW, st.gridH);
  const b64 = await canvasToPngBase64(canvas);
  const filename = `glyph_${g.char === ' ' ? 'space' : g.char}.png`;
  await saveBase64File(filename, b64, 'image/png', 'PNG', '*.png');
}

export async function exportAtlasPNG() {
  const st = useEditorStore.getState();
  const canvas = renderAtlasCanvas(st.order, st.glyphs, st.gridW, st.gridH);
  const b64 = await canvasToPngBase64(canvas);
  const filename = `${st.fontName.replace(/\s+/g, '_') || 'font'}_atlas.png`;
  await saveBase64File(filename, b64, 'image/png', 'PNG', '*.png');
}

export async function exportTTF() {
  const st = useEditorStore.getState();
  if (!st.order.length) {
    st.showToast(I18N[st.lang].toastNoGlyphToExport);
    return;
  }
  try {
    const buffer = buildTTFArrayBuffer({
      fontName: st.fontName,
      gridW: st.gridW,
      gridH: st.gridH,
      baselineRow: st.baselineRow,
      originalUnitsPerEm: st.originalUnitsPerEm,
      originalAscender: st.originalAscender,
      originalDescender: st.originalDescender,
      originalNativeSize: st.originalNativeSize,
      glyphs: st.glyphs,
      order: st.order,
    });
    const b64 = arrayBufferToBase64(buffer);
    const filename = `${st.fontName.replace(/\s+/g, '_') || 'font'}.ttf`;
    await saveBase64File(filename, b64, 'font/ttf', 'TrueType Font', '*.ttf');
  } catch (err) {
    console.error(err);
    st.showToast(I18N[st.lang].toastInvalidTTF);
  }
}

function normalizeUpdateAvailable(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

async function getUpdateInfo(force = false) {
  try {
    const [version, url, available, errorMessage] =
      await AppBindings.CheckForUpdates(force);
    if (errorMessage) {
      console.warn('Update check skipped', errorMessage);
      return null;
    }
    if (!normalizeUpdateAvailable(available) || !version) {
      return null;
    }
    return { version, url };
  } catch (err) {
    console.warn('Update check skipped', err);
    return null;
  }
}

// Check GitHub Releases for a newer application version. The startup path
// uses the cached behavior to avoid hammering the GitHub API on every launch.
export async function checkForUpdates(force = false) {
  const st = useEditorStore.getState();
  const info = await getUpdateInfo(force);
  if (!info) {
    return null;
  }
  st.showToast(
    I18N[st.lang].updateAvailable.replace('{version}', info.version),
  );
  return info;
}

export async function checkForUpdatesStatus(force = false) {
  return getUpdateInfo(force);
}

export async function hasCompatibleUpdate(force = false): Promise<boolean> {
  try {
    const [, , available] = await AppBindings.CheckForUpdates(force);
    return normalizeUpdateAvailable(available);
  } catch {
    return false;
  }
}

// Trigger a manual update attempt from the toolbar. When a matching release
// asset exists, it is downloaded to the local cache for the current platform.
export async function downloadAndInstallUpdate(force = false) {
  const st = useEditorStore.getState();
  try {
    const info = await checkForUpdates(force);
    if (!info?.url) {
      st.showToast(I18N[st.lang].updateUnavailable);
      return;
    }
    const result = await AppBindings.DownloadAndInstallUpdate(info.url);
    st.showToast(I18N[st.lang].updateDownloaded.replace('{path}', result));
  } catch (err) {
    console.error(err);
    st.showToast(I18N[st.lang].updateFailed);
  }
}
