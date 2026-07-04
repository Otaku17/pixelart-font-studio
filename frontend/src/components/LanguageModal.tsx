import { useEffect } from 'react';
import { Icon } from './Icon';
import { FlagIcon } from './FlagIcon';
import { useEditorStore } from '../state/store';
import { I18N, AVAILABLE_LANGS } from '../lib/i18n';

export function LanguageModal({ onClose }: { onClose: () => void }) {
  const lang = useEditorStore((s) => s.lang);
  const langFollowsSystem = useEditorStore((s) => s.langFollowsSystem);
  const setLang = useEditorStore((s) => s.setLang);
  const useSystemLang = useEditorStore((s) => s.useSystemLang);
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
            <Icon name="globe" /> {t.chooseLanguage}
          </div>
          <button className="ghost-btn" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">
          <ul className="lang-list">
            <li>
              <button
                className={`lang-list-item${langFollowsSystem ? ' active' : ''}`}
                onClick={() => {
                  useSystemLang();
                  onClose();
                }}
              >
                <Icon name="monitor" />
                <span className="lang-list-label">{t.systemLanguage}</span>
                {langFollowsSystem && (
                  <Icon name="check" className="lang-list-check" />
                )}
              </button>
            </li>
            <li className="lang-list-sep">
              <div className="menu-sep" />
            </li>
            {AVAILABLE_LANGS.map((meta) => (
              <li key={meta.code}>
                <button
                  className={`lang-list-item${!langFollowsSystem && meta.code === lang ? ' active' : ''}`}
                  onClick={() => {
                    setLang(meta.code);
                    onClose();
                  }}
                >
                  <span className="lang-list-flag">
                    <FlagIcon code={meta.code} fallbackEmoji={meta.flag} />
                  </span>
                  <span className="lang-list-label">{meta.label}</span>
                  {!langFollowsSystem && meta.code === lang && (
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
