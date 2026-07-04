import { useEffect } from 'react';
import { Icon } from './Icon';
import { useEditorStore } from '../state/store';
import { I18N } from '../lib/i18n';
import type { ThemePref } from '../lib/theme';

const THEME_OPTIONS: {
  pref: ThemePref;
  icon: string;
  labelKey:
    | 'themeSystem'
    | 'themeLight'
    | 'themeDark'
    | 'themeSepia'
    | 'themeContrast';
}[] = [
  { pref: 'system', icon: 'monitor', labelKey: 'themeSystem' },
  { pref: 'light', icon: 'sun', labelKey: 'themeLight' },
  { pref: 'dark', icon: 'moon', labelKey: 'themeDark' },
  { pref: 'sepia', icon: 'droplet', labelKey: 'themeSepia' },
  { pref: 'contrast', icon: 'contrast', labelKey: 'themeContrast' },
];

export function ThemeModal({ onClose }: { onClose: () => void }) {
  const lang = useEditorStore((s) => s.lang);
  const themePref = useEditorStore((s) => s.themePref);
  const setThemePref = useEditorStore((s) => s.setThemePref);
  const t = I18N[lang];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box">
        <div className="modal-head">
          <div className="modal-title">
            <Icon name="sun" /> {t.chooseTheme}
          </div>
          <button className="ghost-btn" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">
          <ul className="lang-list">
            {THEME_OPTIONS.map((opt) => (
              <li key={opt.pref}>
                <button
                  className={`lang-list-item${opt.pref === themePref ? ' active' : ''}`}
                  onClick={() => {
                    setThemePref(opt.pref);
                    onClose();
                  }}
                >
                  <Icon name={opt.icon} />
                  <span className="lang-list-label">{t[opt.labelKey]}</span>
                  {opt.pref === themePref && (
                    <Icon name="check" className="lang-list-check" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
