import { Fragment } from 'react';
import { Kbd, Modal } from 'soft-dark-ui';
import { useDict } from '../../state/prefs';
import { ui } from '../../state/ui';

const IS_MAC = navigator.platform?.toLowerCase().includes('mac');

/** "Ctrl/Cmd + Z" → [Ctrl][Z] (or [⌘][Z] on macOS); "B / E / G" → [B] / [E] / [G]. */
function KeyCombo({ keys }: { keys: string }) {
  const alternatives = keys.split(' / ');
  return (
    <span className="key-combo">
      {alternatives.map((alt, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="key-combo__or">/</span>}
          <Kbd keys={alt.split(' + ').map((k) => (k === 'Ctrl/Cmd' ? (IS_MAC ? '⌘' : 'Ctrl') : k))} />
        </Fragment>
      ))}
    </span>
  );
}

export function ShortcutsModal() {
  const t = useDict();
  return (
    <Modal open onClose={() => ui.close()} title={t.shortcutsTitle}>
      <table className="shortcuts-table">
        <tbody>
          {t.shortcutsList.map((row, i) => (
            <tr key={i}>
              <td>
                <KeyCombo keys={row.keys} />
              </td>
              <td>{row.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
