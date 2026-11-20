import { useEffect, useState } from 'react';
import { Menubar, type MenubarMenu } from 'soft-dark-ui';
import { format } from '../../i18n';
import { exportActor } from '../../services/exportActor';
import { importFontFile, openProjectFile, saveProject } from '../../services/commands';
import { getAppVersion } from '../../services/updates';
import { editor, getEditor } from '../../state/editor/store';
import { useDict } from '../../state/prefs';
import { ui } from '../../state/ui';
import { UpdateButton } from '../update/UpdateButton';

const MOD = navigator.platform?.toLowerCase().includes('mac') ? 'Cmd' : 'Ctrl';

export function AppHeader() {
  const t = useDict();
  const [version, setVersion] = useState('');

  useEffect(() => {
    void getAppVersion().then(setVersion);
  }, []);

  const menus: MenubarMenu[] = [
    {
      label: t.file,
      items: [
        { type: 'item', label: t.newProject, onSelect: () => editor.newProject() },
        { type: 'separator' },
        { type: 'item', label: t.openFont, onSelect: () => void importFontFile() },
        { type: 'item', label: t.openProject, shortcut: `${MOD} O`, onSelect: () => void openProjectFile() },
        { type: 'separator' },
        { type: 'item', label: t.saveProject, shortcut: `${MOD} S`, onSelect: () => void saveProject() },
        { type: 'item', label: t.exportMenu, shortcut: `${MOD} E`, onSelect: () => exportActor.send({ type: 'OPEN' }) },
      ],
    },
    {
      label: t.edit,
      items: [
        { type: 'item', label: t.undo, shortcut: `${MOD} Z`, onSelect: () => editor.undo() },
        { type: 'item', label: t.redo, shortcut: `${MOD} Y`, onSelect: () => editor.redo() },
        { type: 'separator' },
        {
          type: 'item',
          label: t.duplicateGlyphMenu,
          onSelect: () => {
            const key = getEditor().currentKey;
            if (key) editor.copyGlyph({ key });
          },
        },
        { type: 'item', label: t.clear, shortcut: 'Del', danger: true, onSelect: () => editor.clearCurrent() },
      ],
    },
    {
      label: t.view,
      items: [
        { type: 'item', label: t.fullscreenPreviewTitle, onSelect: () => ui.open({ dialog: 'fullGrid' }) },
        { type: 'item', label: t.zoomIn, onSelect: () => editor.setZoom({ zoom: getEditor().zoom + 2 }) },
        { type: 'item', label: t.zoomOut, onSelect: () => editor.setZoom({ zoom: getEditor().zoom - 2 }) },
      ],
    },
    {
      label: t.preferences,
      items: [{ type: 'item', label: `${t.language} / ${t.theme}…`, onSelect: () => ui.open({ dialog: 'prefs' }) }],
    },
    {
      label: t.help,
      items: [
        { type: 'item', label: t.shortcutsTitle, onSelect: () => ui.open({ dialog: 'shortcuts' }) },
        { type: 'separator' },
        { type: 'label', label: version ? format(t.version, { version }) : 'PixelArt Font Studio' },
      ],
    },
  ];

  return (
    <header className="app-header">
      <Menubar menus={menus} />
      <div className="app-header__spacer" />
      <UpdateButton />
    </header>
  );
}
