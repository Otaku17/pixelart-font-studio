import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { ShortcutsModal } from './ShortcutsModal';
import { LanguageModal } from './LanguageModal';
import { ThemeModal } from './ThemeModal';
import { FlagIcon } from './FlagIcon';
import { useEditorStore } from '../state/store';
import { I18N, AVAILABLE_LANGS } from '../lib/i18n';
import {
  importFontFile,
  openProjectFile,
  exportProjectJSON,
  exportAtlasPNG,
  exportGlyphPNG,
  exportTTF,
  hasCompatibleUpdate,
  downloadAndInstallUpdate,
} from '../lib/actions';

export function MenuBar() {
  const lang = useEditorStore((s) => s.lang);
  const newBlankProject = useEditorStore((s) => s.newBlankProject);
  const t = I18N[lang];
  const currentLangMeta = AVAILABLE_LANGS.find((m) => m.code === lang);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const themePref = useEditorStore((s) => s.themePref);
  const THEME_ICON: Record<string, string> = {
    system: 'monitor',
    light: 'sun',
    dark: 'moon',
  };
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick() {
      setOpenMenu(null);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const status = await hasCompatibleUpdate(true);
      if (!cancelled) {
        setUpdateAvailable(status);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleMenu(name: string, e: React.MouseEvent) {
    e.stopPropagation();
    setOpenMenu((cur) => (cur === name ? null : name));
  }

  return (
    <div className="menubar" ref={rootRef}>
      <div className="brand">
        <span className="glyph-mark">
          <span />
          <span />
          <span />
          <span />
        </span>
        PixelArt Font Studio
      </div>

      <div className={`menu${openMenu === 'file' ? ' open' : ''}`}>
        <button className="menu-trigger" onClick={(e) => toggleMenu('file', e)}>
          {t.file}
        </button>
        <div className="menu-dropdown">
          <button className="menu-item" onClick={() => newBlankProject()}>
            <Icon name="filePlus" /> {t.newProject}
          </button>
          <div className="menu-sep" />
          <button className="menu-item" onClick={() => importFontFile()}>
            <Icon name="folderOpen" /> {t.openFont}
          </button>
          <button className="menu-item" onClick={() => openProjectFile()}>
            <Icon name="fileJson" /> {t.openProject}
          </button>
          <div className="menu-sep" />
          <button className="menu-item" onClick={() => exportProjectJSON()}>
            <Icon name="save" /> {t.exportProject}
          </button>
          <button className="menu-item" onClick={() => exportAtlasPNG()}>
            <Icon name="image" /> {t.exportAtlas}
          </button>
          <button className="menu-item" onClick={() => exportGlyphPNG()}>
            <Icon name="imageDown" /> {t.exportGlyphMenu}
          </button>
          <button className="menu-item highlight" onClick={() => exportTTF()}>
            <Icon name="fileType" /> {t.exportTTF}
          </button>
        </div>
      </div>

      <div className={`menu${openMenu === 'edit' ? ' open' : ''}`}>
        <button className="menu-trigger" onClick={(e) => toggleMenu('edit', e)}>
          {t.edit}
        </button>
        <div className="menu-dropdown">
          <button
            className="menu-item"
            onClick={() => useEditorStore.getState().undo()}
          >
            <Icon name="undo" /> {t.undo} <span className="kbd">Ctrl+Z</span>
          </button>
          <button
            className="menu-item"
            onClick={() => useEditorStore.getState().redo()}
          >
            <Icon name="redo" /> {t.redo} <span className="kbd">Ctrl+Y</span>
          </button>
        </div>
      </div>

      <div className={`menu${openMenu === 'preferences' ? ' open' : ''}`}>
        <button
          className="menu-trigger"
          onClick={(e) => toggleMenu('preferences', e)}
        >
          {t.preferences}
        </button>
        <div className="menu-dropdown">
          <button className="menu-item" onClick={() => setLanguageOpen(true)}>
            <Icon name="globe" /> {t.language}
            <span className="menu-item-tag">
              {currentLangMeta && (
                <FlagIcon
                  code={currentLangMeta.code}
                  fallbackEmoji={currentLangMeta.flag}
                />
              )}
            </span>
          </button>
          <button className="menu-item" onClick={() => setThemeOpen(true)}>
            <Icon name={THEME_ICON[themePref]} /> {t.theme}
          </button>
        </div>
      </div>

      <div className={`menu${openMenu === 'help' ? ' open' : ''}`}>
        <button className="menu-trigger" onClick={(e) => toggleMenu('help', e)}>
          {t.help}
        </button>
        <div className="menu-dropdown">
          <button className="menu-item" onClick={() => setShortcutsOpen(true)}>
            <Icon name="keyboard" /> {t.shortcutsTitle}
          </button>
          <div className="menu-sep" />
          <div className="menu-static">{t.helpText}</div>
        </div>
      </div>

      <div
        className={`menu menubar-update${updateAvailable ? ' update-ready' : ''}`}
      >
        <button
          className="menu-trigger update-trigger"
          onClick={() => void downloadAndInstallUpdate(true)}
          title={t.updateButton}
        >
          <Icon name="refresh" /> {t.updateButton}
        </button>
      </div>

      {shortcutsOpen && (
        <ShortcutsModal onClose={() => setShortcutsOpen(false)} />
      )}
      {languageOpen && <LanguageModal onClose={() => setLanguageOpen(false)} />}
      {themeOpen && <ThemeModal onClose={() => setThemeOpen(false)} />}
    </div>
  );
}
