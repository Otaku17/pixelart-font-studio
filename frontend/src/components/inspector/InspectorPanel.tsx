import { Button, DescriptionList, Icon, InlineEdit } from 'soft-dark-ui';
import { exportActor } from '../../services/exportActor';
import { importFontFile, openProjectFile, saveProject } from '../../services/commands';
import { editor, useEditor } from '../../state/editor/store';
import { useDict } from '../../state/prefs';
import { TextPreview } from './TextPreview';

/** Right column: font info, text preview, file actions. */
export function InspectorPanel() {
  const t = useDict();
  const fontName = useEditor((c) => c.fontName);
  const count = useEditor((c) => c.order.length);
  const gridW = useEditor((c) => c.gridW);
  const gridH = useEditor((c) => c.gridH);
  const baselineRow = useEditor((c) => c.baselineRow);

  return (
    <div className="inspector">
      <div className="panel-head">{t.fontLabel}</div>
      <div className="block">
        <InlineEdit label={t.fontNameLabel} value={fontName} onChange={(name) => name.trim() && editor.setFontName({ name: name.trim() })} />
        <DescriptionList
          items={[
            [t.glyphs, count],
            [t.grid, `${gridW} × ${gridH} px`],
            [t.baseline, `${baselineRow}px`],
          ]}
        />
      </div>

      <div className="panel-head">{t.previewTitle}</div>
      <TextPreview />

      <div className="panel-head">{t.importExportLabel}</div>
      <div className="block actions">
        <Button variant="secondary" icon={<Icon name="folder" />} onClick={() => void importFontFile()}>
          {t.openFont}
        </Button>
        <Button variant="secondary" icon={<Icon name="file" />} onClick={() => void openProjectFile()}>
          {t.openProject}
        </Button>
        <Button variant="secondary" icon={<Icon name="check-sm" />} onClick={() => void saveProject()}>
          {t.saveProject}
        </Button>
        <Button variant="primary" icon={<Icon name="upload" />} onClick={() => exportActor.send({ type: 'OPEN' })}>
          {t.exportButton}
        </Button>
      </div>
    </div>
  );
}
