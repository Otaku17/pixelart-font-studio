/**
 * Lightweight i18n engine.
 *
 * How to add a new language:
 *   1. Duplicate one of the files in `src/assets/locales/*.json`.
 *   2. Translate every value, keep every key identical.
 *   3. Update the `_meta` block (code / label / flag) with the new language.
 * That's it — the file is picked up automatically at build time, and the
 * new language shows up in Preferences ▸ Language without touching any
 * other code.
 */
import type { Lang } from '../types';

export interface Dict {
  file: string;
  edit: string;
  help: string;
  preferences: string;
  language: string;
  chooseLanguage: string;
  systemLanguage: string;
  newProject: string;
  glyphs: string;
  filterPlaceholder: string;
  openFont: string;
  openProject: string;
  exportProject: string;
  exportAtlas: string;
  exportGlyphMenu: string;
  exportTTF: string;
  undo: string;
  redo: string;
  mirrorH: string;
  mirrorV: string;
  shiftLeft: string;
  shiftRight: string;
  shiftUp: string;
  shiftDown: string;
  invert: string;
  clear: string;
  noFont: string;
  baseline: string;
  advanceWidth: string;
  grid: string;
  tool: string;
  previewTitle: string;
  previewZoom: string;
  previewInk: string;
  previewPaper: string;
  previewSpacing: string;
  previewEmptyHint: string;
  helpText: string;
  exportGlyph: string;
  noGlyphSelected: string;
  fullscreenPreviewTitle: string;
  tools: {
    pencil: string;
    eraser: string;
    bucket: string;
    line: string;
    rect: string;
    select: string;
  };
  duplicateGlyph: string;
  pasteAsNew: string;
  clipboardEmpty: string;
  shortcutsTitle: string;
  shortcutsList: { keys: string; desc: string }[];
  fontLabel: string;
  importExportLabel: string;
  historyLabel: string;
  mirrorLabel: string;
  shiftLabel: string;
  clearLabel: string;
  viewLabel: string;
  addGlyph: string;
  toastNewProject: string;
  toastImported: string;
  toastProjectLoaded: string;
  toastSelectionCopied: string;
  toastGlyphCopied: string;
  toastClipboardEmpty: string;
  toastGlyphPasted: string;
  toastFontReadError: string;
  toastProjectLoadError: string;
  toastNoGlyphToExport: string;
  toastInvalidTTF: string;
  updateLabel: string;
  updateButton: string;
  updateAvailable: string;
  updateUnavailable: string;
  updateDownloaded: string;
  updateFailed: string;
  theme: string;
  chooseTheme: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;
  themeSepia: string;
  themeContrast: string;
  zoomHint: string;
}

export interface LangMeta {
  code: string;
  label: string;
  flag: string;
}

type LocaleFile = Dict & { _meta: LangMeta };

// Eagerly import every JSON file in assets/locales — adding a file there is
// enough for it to be included, no manual registration needed.
const modules = import.meta.glob('../assets/locales/*.json', {
  eager: true,
}) as Record<string, { default: LocaleFile }>;

const LOCALES: Record<string, Dict> = {};
const METAS: LangMeta[] = [];

for (const path in modules) {
  const locale = modules[path].default;
  if (!locale?._meta?.code) continue;
  LOCALES[locale._meta.code] = locale;
  METAS.push(locale._meta);
}

/** Every language found in assets/locales, sorted alphabetically by label. */
export const AVAILABLE_LANGS: LangMeta[] = METAS.sort((a, b) =>
  a.label.localeCompare(b.label),
);

export const DEFAULT_LANG: Lang = LOCALES['en']
  ? 'en'
  : (AVAILABLE_LANGS[0]?.code ?? 'en');

/** All translation dictionaries, keyed by language code. Falls back to the default language for an unknown key. */
export const I18N: Record<Lang, Dict> = new Proxy(LOCALES, {
  get(target, key: string) {
    return target[key] ?? target[DEFAULT_LANG];
  },
});

const STORAGE_KEY = 'pafs.lang';

export function isSupportedLang(code: string | null | undefined): code is Lang {
  return !!code && code in LOCALES;
}

/** Reads the language the user previously chose in Preferences, if any. */
export function loadStoredLang(): Lang | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isSupportedLang(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** Persists the user's language choice so it's remembered next launch. */
export function storeLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // localStorage unavailable (e.g. privacy mode) — ignore, just won't persist.
  }
}

/** Removes the saved preference so the app goes back to following the system language. */
export function clearStoredLang(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Detects the OS/browser language, falling back to the app default when unsupported. */
export function detectSystemLang(): Lang {
  const candidates = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const candidate of candidates) {
    const code = candidate?.slice(0, 2).toLowerCase();
    if (isSupportedLang(code)) return code;
  }
  return DEFAULT_LANG;
}

/** Resolves the language to use on startup: saved preference first, otherwise the system language. */
export function resolveInitialLang(): Lang {
  return loadStoredLang() ?? detectSystemLang();
}
