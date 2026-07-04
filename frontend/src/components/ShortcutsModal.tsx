import { useEffect } from 'react';
import { Icon } from './Icon';
import { useEditorStore } from '../state/store';
import { I18N } from '../lib/i18n';

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const lang = useEditorStore((s) => s.lang);
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
            <Icon name="keyboard" /> {t.shortcutsTitle}
          </div>
          <button className="ghost-btn" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">
          <table className="shortcuts-table">
            <tbody>
              {t.shortcutsList.map((row, i) => (
                <tr key={i}>
                  <td>
                    <span className="kbd-inline">{row.keys}</span>
                  </td>
                  <td>{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
