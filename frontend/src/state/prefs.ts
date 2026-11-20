import { createStore } from '@xstate/store';
import { useSelector } from '@xstate/store/react';
import { detectSystemLang, dictFor, loadStoredLang, storeLang, translate, type Lang, type TextKey } from '../i18n';
import { loadStoredThemePref, resolveTheme, storeThemePref, type ResolvedTheme, type ThemePref } from './theme';

interface PrefsContext {
  lang: Lang;
  /** True while the language follows the OS instead of a pinned choice. */
  langFollowsSystem: boolean;
  themePref: ThemePref;
  resolvedTheme: ResolvedTheme;
  /** Pixel colors used by the editor grid, glyph tiles and text preview. */
  ink: string;
  paper: string;
}

const COLORS_KEY = 'pafs.colors';
const DEFAULT_COLORS = { ink: '#ffffff', paper: '#0a0a0a' };

function loadColors(): { ink: string; paper: string } {
  try {
    const c = JSON.parse(localStorage.getItem(COLORS_KEY) ?? '{}') as Partial<typeof DEFAULT_COLORS>;
    const hex = (v: unknown, d: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
    return { ink: hex(c.ink, DEFAULT_COLORS.ink), paper: hex(c.paper, DEFAULT_COLORS.paper) };
  } catch {
    return DEFAULT_COLORS;
  }
}

function storeColors(colors: { ink: string; paper: string }) {
  try {
    localStorage.setItem(COLORS_KEY, JSON.stringify(colors));
  } catch {
    // storage unavailable: the choice just won't persist
  }
}

const storedLang = loadStoredLang();
const storedTheme = loadStoredThemePref();

/** User preferences (language, theme), persisted in localStorage. */
export const prefsStore = createStore({
  context: {
    lang: storedLang ?? detectSystemLang(),
    langFollowsSystem: storedLang === null,
    themePref: storedTheme,
    resolvedTheme: resolveTheme(storedTheme),
    ...loadColors(),
  } as PrefsContext,
  on: {
    setLang: (ctx, e: { lang: Lang }, enq) => {
      enq.effect(() => storeLang(e.lang));
      return { ...ctx, lang: e.lang, langFollowsSystem: false };
    },
    followSystemLang: (ctx, _e, enq) => {
      enq.effect(() => storeLang(null));
      return { ...ctx, lang: detectSystemLang(), langFollowsSystem: true };
    },
    setThemePref: (ctx, e: { pref: ThemePref }, enq) => {
      enq.effect(() => storeThemePref(e.pref));
      return { ...ctx, themePref: e.pref, resolvedTheme: resolveTheme(e.pref) };
    },
    setColors: (ctx, e: { ink?: string; paper?: string }, enq) => {
      const next = { ink: e.ink ?? ctx.ink, paper: e.paper ?? ctx.paper };
      enq.effect(() => storeColors(next));
      return { ...ctx, ...next };
    },
    /** OS color scheme changed (only meaningful while following the system). */
    systemThemeChanged: (ctx) =>
      ctx.themePref === 'system' ? { ...ctx, resolvedTheme: resolveTheme('system') } : ctx,
  },
});

export function usePrefs<T>(select: (ctx: PrefsContext) => T): T {
  return useSelector(prefsStore, (s) => select(s.context));
}

/** Current dictionary, re-rendering on language change. */
export function useDict() {
  return dictFor(usePrefs((p) => p.lang));
}

/** Translation outside React (commands, machines). */
export function t(key: TextKey, params?: Record<string, string | number>): string {
  return translate(prefsStore.getSnapshot().context.lang, key, params);
}
