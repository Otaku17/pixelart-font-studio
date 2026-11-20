/**
 * Lightweight i18n engine.
 *
 * To add a language: duplicate a file in `./locales`, translate every value
 * (keep the keys) and update its `_meta` block. It is picked up at build time
 * and shows up in Preferences without touching any other code.
 */
import en from './locales/en.json';

type LocaleFile = typeof en;
export type Dict = Omit<LocaleFile, '_meta'>;
export type TextKey = { [K in keyof Dict]: Dict[K] extends string ? K : never }[keyof Dict];
export type Lang = string;
export type LangMeta = LocaleFile['_meta'];

const modules = import.meta.glob('./locales/*.json', { eager: true }) as Record<
  string,
  { default: LocaleFile }
>;

const LOCALES: Record<string, Dict> = {};
const METAS: LangMeta[] = [];

for (const path in modules) {
  const locale = modules[path].default;
  if (!locale?._meta?.code) continue;
  LOCALES[locale._meta.code] = locale;
  METAS.push(locale._meta);
}

/** Every language found in ./locales, sorted by label. */
export const AVAILABLE_LANGS: LangMeta[] = METAS.sort((a, b) => a.label.localeCompare(b.label));

export const DEFAULT_LANG: Lang = LOCALES.en ? 'en' : (AVAILABLE_LANGS[0]?.code ?? 'en');

export function dictFor(lang: Lang): Dict {
  return LOCALES[lang] ?? LOCALES[DEFAULT_LANG];
}

/** Replaces `{name}` placeholders. */
export function format(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

export function translate(lang: Lang, key: TextKey, params?: Record<string, string | number>): string {
  return format(dictFor(lang)[key] ?? dictFor(DEFAULT_LANG)[key], params);
}

const STORAGE_KEY = 'pafs.lang';

export function isSupportedLang(code: string | null | undefined): code is Lang {
  return !!code && code in LOCALES;
}

export function loadStoredLang(): Lang | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isSupportedLang(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function storeLang(lang: Lang | null): void {
  try {
    if (lang) localStorage.setItem(STORAGE_KEY, lang);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable: the choice just won't persist
  }
}

export function detectSystemLang(): Lang {
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const candidate of candidates) {
    const code = candidate?.slice(0, 2).toLowerCase();
    if (isSupportedLang(code)) return code;
  }
  return DEFAULT_LANG;
}
