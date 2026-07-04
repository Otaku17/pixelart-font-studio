import { create } from 'zustand';
import type { Glyph, ProjectJSON, Tool, Lang } from '../types';
import { blankBitmap, type Region } from '../lib/bitmap';
import type { LoadedFontProject } from '../lib/font/rasterize';
import { charFromCodepoint } from '../lib/font/rasterize';
import {
  I18N,
  resolveInitialLang,
  storeLang,
  detectSystemLang,
  loadStoredLang,
  clearStoredLang,
} from '../lib/i18n';
import type { ThemePref, ResolvedTheme } from '../lib/theme';
import {
  loadStoredThemePref,
  storeThemePref,
  resolveTheme,
} from '../lib/theme';
import {
  DEFAULT_BASELINE_ROW,
  DEFAULT_CHARS,
  DEFAULT_FONT_NAME,
  DEFAULT_GRID_H,
  DEFAULT_GRID_W,
} from '../lib/projectDefaults';

const UNDO_LIMIT = 50;

interface EditorState {
  fontName: string;
  gridW: number;
  gridH: number;
  baselineRow: number;
  glyphs: Record<string, Glyph>;
  order: string[];
  currentKey: string | null;
  tool: Tool;
  zoom: number;
  lang: Lang;
  /** True when the language hasn't been manually pinned and just follows the OS language. */
  langFollowsSystem: boolean;

  themePref: ThemePref;
  resolvedTheme: ResolvedTheme;

  originalUnitsPerEm: number;
  originalAscender: number;
  originalDescender: number;
  originalNativeSize: number;

  undoStacks: Record<string, Uint8Array[]>;
  redoStacks: Record<string, Uint8Array[]>;

  /** Shared clipboard for both the selection tool (copy/paste a region) and "duplicate glyph" (copy/paste a whole glyph). */
  clipboard: (Region & { advance?: number }) | null;

  toastMessage: string | null;

  // actions
  newBlankProject: () => void;
  loadFontProject: (loaded: LoadedFontProject) => void;
  loadProjectJSON: (json: ProjectJSON) => void;
  ensureGlyph: (cp: number, char?: string) => void;
  addGlyphByChar: (char: string) => void;
  deleteGlyph: (key: string) => void;
  selectGlyph: (key: string) => void;
  setTool: (tool: Tool) => void;
  setZoom: (z: number) => void;
  setLang: (l: Lang) => void;
  useSystemLang: () => void;
  setThemePref: (pref: ThemePref) => void;
  setBaselineRow: (n: number) => void;
  setAdvance: (n: number) => void;
  setGlyphBitmapLive: (key: string, bitmap: Uint8Array) => void;
  commitGlyphBitmap: (
    key: string,
    before: Uint8Array,
    after: Uint8Array,
  ) => void;
  transformCurrentGlyph: (
    fn: (dst: Uint8Array, src: Uint8Array, w: number, h: number) => void,
  ) => void;
  clearCurrentGlyph: () => void;
  undo: () => void;
  redo: () => void;
  showToast: (msg: string) => void;
  clearToast: () => void;

  setClipboardRegion: (region: Region) => void;
  copyGlyphToClipboard: (key: string) => void;
  pasteAsNewGlyph: (char: string) => void;
}

function makeGlyph(gridW: number, gridH: number, char: string): Glyph {
  return {
    bitmap: blankBitmap(gridW, gridH),
    advance: gridW,
    char,
    edited: false,
    sourceRasterized: false,
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  fontName: DEFAULT_FONT_NAME,
  gridW: DEFAULT_GRID_W,
  gridH: DEFAULT_GRID_H,
  baselineRow: DEFAULT_BASELINE_ROW,
  glyphs: {},
  order: [],
  currentKey: null,
  tool: 'pencil',
  zoom: 20,
  lang: resolveInitialLang(),
  langFollowsSystem: loadStoredLang() === null,

  themePref: loadStoredThemePref(),
  resolvedTheme: resolveTheme(loadStoredThemePref()),

  originalUnitsPerEm: 1000,
  originalAscender: 800,
  originalDescender: -200,
  originalNativeSize: 16,

  undoStacks: {},
  redoStacks: {},

  clipboard: null,

  toastMessage: null,

  newBlankProject: () => {
    const gridW = DEFAULT_GRID_W;
    const gridH = DEFAULT_GRID_H;
    const baselineRow = DEFAULT_BASELINE_ROW;
    const glyphs: Record<string, Glyph> = {};
    const order: string[] = [];
    for (const ch of DEFAULT_CHARS) {
      const cp = ch.codePointAt(0)!;
      const key = String(cp);
      glyphs[key] = makeGlyph(gridW, gridH, ch);
      order.push(key);
    }
    set({
      fontName: DEFAULT_FONT_NAME,
      gridW,
      gridH,
      baselineRow,
      glyphs,
      order,
      currentKey: order[0] ?? null,
      undoStacks: {},
      redoStacks: {},
      toastMessage: I18N[get().lang].toastNewProject,
    });
  },

  loadFontProject: (loaded) => {
    set({
      fontName: loaded.fontName,
      gridW: loaded.gridW,
      gridH: loaded.gridH,
      baselineRow: loaded.baselineRow,
      glyphs: loaded.glyphs,
      order: loaded.order,
      currentKey: loaded.order[0] ?? null,
      originalUnitsPerEm: loaded.originalUnitsPerEm,
      originalAscender: loaded.originalAscender,
      originalDescender: loaded.originalDescender,
      originalNativeSize: loaded.originalNativeSize,
      undoStacks: {},
      redoStacks: {},
      toastMessage: I18N[get().lang].toastImported.replace(
        '{size}',
        String(loaded.originalNativeSize),
      ),
    });
  },

  loadProjectJSON: (json) => {
    const gridW = Number(json.gridW) || get().gridW;
    const gridH = Number(json.gridH) || get().gridH;
    const glyphs: Record<string, Glyph> = {};
    const order: string[] = [];

    Object.keys(json.glyphs)
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
      .forEach((key) => {
        const item = json.glyphs[key];
        const raw = new Uint8Array(item.bitmap || []);
        let bitmap: Uint8Array;
        if (raw.length !== gridW * gridH) {
          bitmap = blankBitmap(gridW, gridH);
          bitmap.set(raw.subarray(0, Math.min(raw.length, bitmap.length)));
        } else {
          bitmap = raw;
        }
        glyphs[key] = {
          bitmap,
          advance: item.advance || gridW,
          char: item.char || charFromCodepoint(parseInt(key, 10)),
          edited: !!item.edited,
          sourceRasterized: !!item.sourceRasterized,
        };
        order.push(key);
      });

    set({
      fontName: json.fontName || get().fontName,
      gridW,
      gridH,
      baselineRow: Number(json.baselineRow) || get().baselineRow,
      glyphs,
      order,
      currentKey: order[0] ?? null,
      undoStacks: {},
      redoStacks: {},
      toastMessage: I18N[get().lang].toastProjectLoaded,
    });
  },

  ensureGlyph: (cp, char) => {
    const key = String(cp);
    const st = get();
    if (st.glyphs[key]) return;
    const glyph = makeGlyph(st.gridW, st.gridH, char || charFromCodepoint(cp));
    set({
      glyphs: { ...st.glyphs, [key]: glyph },
      order: [...st.order, key],
    });
  },

  addGlyphByChar: (char) => {
    if (!char) return;
    const cp = char.codePointAt(0);
    if (cp === undefined) return;
    const st = get();
    const key = String(cp);
    if (st.glyphs[key]) {
      set({ currentKey: key });
      return;
    }
    const glyph = makeGlyph(st.gridW, st.gridH, char);
    set({
      glyphs: { ...st.glyphs, [key]: glyph },
      order: [...st.order, key].sort(
        (a, b) => parseInt(a, 10) - parseInt(b, 10),
      ),
      currentKey: key,
    });
  },

  deleteGlyph: (key) => {
    const st = get();
    if (!st.glyphs[key]) return;
    const glyphs = { ...st.glyphs };
    delete glyphs[key];
    const order = st.order.filter((k) => k !== key);
    const undoStacks = { ...st.undoStacks };
    const redoStacks = { ...st.redoStacks };
    delete undoStacks[key];
    delete redoStacks[key];
    const currentKey =
      st.currentKey === key ? (order[0] ?? null) : st.currentKey;
    set({ glyphs, order, undoStacks, redoStacks, currentKey });
  },

  selectGlyph: (key) => set({ currentKey: key }),
  setTool: (tool) => set({ tool }),
  setZoom: (zoom) => set({ zoom: Math.min(40, Math.max(6, zoom)) }),
  setLang: (lang) => {
    storeLang(lang);
    set({ lang, langFollowsSystem: false });
  },
  useSystemLang: () => {
    clearStoredLang();
    set({ lang: detectSystemLang(), langFollowsSystem: true });
  },
  setThemePref: (pref) => {
    storeThemePref(pref);
    set({ themePref: pref, resolvedTheme: resolveTheme(pref) });
  },
  setBaselineRow: (n) => set({ baselineRow: n }),

  setAdvance: (n) => {
    const st = get();
    if (!st.currentKey) return;
    const g = st.glyphs[st.currentKey];
    if (!g) return;
    set({
      glyphs: { ...st.glyphs, [st.currentKey]: { ...g, advance: n } },
    });
  },

  setGlyphBitmapLive: (key, bitmap) => {
    const st = get();
    const g = st.glyphs[key];
    if (!g) return;
    set({ glyphs: { ...st.glyphs, [key]: { ...g, bitmap } } });
  },

  commitGlyphBitmap: (key, before, after) => {
    const st = get();
    const g = st.glyphs[key];
    if (!g) return;

    const undoStack = (st.undoStacks[key] || []).slice();
    undoStack.push(before);
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();

    set({
      glyphs: { ...st.glyphs, [key]: { ...g, bitmap: after, edited: true } },
      undoStacks: { ...st.undoStacks, [key]: undoStack },
      redoStacks: { ...st.redoStacks, [key]: [] },
    });
  },

  transformCurrentGlyph: (fn) => {
    const st = get();
    const key = st.currentKey;
    if (!key) {
      set({ toastMessage: I18N[st.lang].noGlyphSelected });
      return;
    }
    const g = st.glyphs[key];
    if (!g) return;
    const before = g.bitmap.slice();
    const dst = new Uint8Array(st.gridW * st.gridH);
    fn(dst, g.bitmap, st.gridW, st.gridH);
    get().commitGlyphBitmap(key, before, dst);
  },

  clearCurrentGlyph: () => {
    const st = get();
    const key = st.currentKey;
    if (!key) {
      set({ toastMessage: I18N[st.lang].noGlyphSelected });
      return;
    }
    const g = st.glyphs[key];
    if (!g) return;
    const before = g.bitmap.slice();
    const after = new Uint8Array(st.gridW * st.gridH);
    get().commitGlyphBitmap(key, before, after);
  },

  undo: () => {
    const st = get();
    const key = st.currentKey;
    if (!key) return;
    const undoStack = st.undoStacks[key];
    if (!undoStack || undoStack.length === 0) return;
    const g = st.glyphs[key];
    if (!g) return;

    const prev = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);
    const redoStack = (st.redoStacks[key] || []).slice();
    redoStack.push(g.bitmap.slice());

    set({
      glyphs: {
        ...st.glyphs,
        [key]: { ...g, bitmap: new Uint8Array(prev), edited: true },
      },
      undoStacks: { ...st.undoStacks, [key]: newUndo },
      redoStacks: { ...st.redoStacks, [key]: redoStack },
    });
  },

  redo: () => {
    const st = get();
    const key = st.currentKey;
    if (!key) return;
    const redoStack = st.redoStacks[key];
    if (!redoStack || redoStack.length === 0) return;
    const g = st.glyphs[key];
    if (!g) return;

    const next = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);
    const undoStack = (st.undoStacks[key] || []).slice();
    undoStack.push(g.bitmap.slice());

    set({
      glyphs: {
        ...st.glyphs,
        [key]: { ...g, bitmap: new Uint8Array(next), edited: true },
      },
      undoStacks: { ...st.undoStacks, [key]: undoStack },
      redoStacks: { ...st.redoStacks, [key]: newRedo },
    });
  },

  showToast: (msg) => set({ toastMessage: msg }),
  clearToast: () => set({ toastMessage: null }),

  setClipboardRegion: (region) => set({ clipboard: region }),

  copyGlyphToClipboard: (key) => {
    const st = get();
    const g = st.glyphs[key];
    if (!g) return;
    set({
      clipboard: {
        bitmap: g.bitmap.slice(),
        w: st.gridW,
        h: st.gridH,
        advance: g.advance,
      },
      toastMessage: I18N[st.lang].toastGlyphCopied,
    });
  },

  pasteAsNewGlyph: (char) => {
    const st = get();
    const clip = st.clipboard;
    if (!clip) {
      set({ toastMessage: I18N[st.lang].toastClipboardEmpty });
      return;
    }
    const cp = char.codePointAt(0);
    if (cp === undefined) return;
    const key = String(cp);

    const existing = st.glyphs[key];
    const base = existing
      ? existing.bitmap.slice()
      : blankBitmap(st.gridW, st.gridH);
    const after = base.slice();
    for (let y = 0; y < clip.h; y++) {
      for (let x = 0; x < clip.w; x++) {
        if (!clip.bitmap[y * clip.w + x]) continue;
        if (x < st.gridW && y < st.gridH) after[y * st.gridW + x] = 1;
      }
    }

    const undoStack = (st.undoStacks[key] || []).slice();
    undoStack.push(base);
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();

    const glyph: Glyph = {
      bitmap: after,
      advance: clip.advance ?? existing?.advance ?? st.gridW,
      char: existing?.char ?? char,
      edited: true,
      sourceRasterized: false,
    };

    const order = existing
      ? st.order
      : [...st.order, key].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    set({
      glyphs: { ...st.glyphs, [key]: glyph },
      order,
      currentKey: key,
      undoStacks: { ...st.undoStacks, [key]: undoStack },
      redoStacks: { ...st.redoStacks, [key]: [] },
      toastMessage: I18N[st.lang].toastGlyphPasted,
    });
  },
}));
