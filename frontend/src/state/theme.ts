/**
 * Theme engine: light / dark / sepia / contrast / system, persisted across launches.
 *
 * Unlike the language ("system" is only checked once at startup), the
 * theme keeps listening to OS changes live while the user has "System"
 * selected — see the effect wired up in App.tsx. "System" only ever
 * resolves to light or dark (there's no OS-level sepia/contrast signal);
 * the other two are picked explicitly by the user.
 */
export type ThemePref = 'system' | 'light' | 'dark' | 'sepia' | 'contrast';
export type ResolvedTheme = 'light' | 'dark' | 'sepia' | 'contrast';

const STORAGE_KEY = 'pafs.theme';
const THEME_PREFS: ThemePref[] = [
  'system',
  'light',
  'dark',
  'sepia',
  'contrast',
];

export function isThemePref(v: string | null | undefined): v is ThemePref {
  return !!v && (THEME_PREFS as string[]).includes(v);
}

/** Reads the user's saved theme preference. Defaults to 'system' if none is stored. */
export function loadStoredThemePref(): ThemePref {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isThemePref(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** Persists the user's theme preference so it's remembered next launch. */
export function storeThemePref(pref: ThemePref): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // localStorage unavailable (e.g. privacy mode) — ignore, just won't persist.
  }
}

/** Reads the OS/browser color scheme preference. */
export function detectSystemTheme(): ResolvedTheme {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: light)').matches
  ) {
    return 'light';
  }
  return 'dark';
}

/** Turns a preference ('system' | 'light' | 'dark') into the actual theme to render. */
export function resolveTheme(pref: ThemePref): ResolvedTheme {
  return pref === 'system' ? detectSystemTheme() : pref;
}

/** Applies the resolved theme to the document so CSS variables pick it up. */
export function applyThemeToDocument(resolved: ResolvedTheme): void {
  document.documentElement.setAttribute('data-theme', resolved);
}
