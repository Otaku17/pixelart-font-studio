import { useSelector } from '@xstate/react';
import { useMemo } from 'react';
import { FORMATS, layoutAtlas, safeFileName, type ExportFormat } from '@pfs/core';
import { Badge, Banner, Button, Icon, Modal, RadioGroup, Spinner } from 'soft-dark-ui';
import { format as fmt } from '../../i18n';
import { exportActor } from '../../services/exportActor';
import { FORMAT_LABEL } from '../../services/exporter';
import { getProject, useEditor } from '../../state/editor/store';
import { useDict } from '../../state/prefs';
import { ExportPreview } from './ExportPreview';
import { RasterFields } from './RasterFields';

const ORDER: ExportFormat[] = ['ttf', 'bmfont', 'atlas', 'glyph', 'project'];
const DESC = { ttf: 'formatTtfDesc', bmfont: 'formatBmfontDesc', atlas: 'formatAtlasDesc', glyph: 'formatGlyphDesc', project: 'formatProjectDesc' } as const;

/** One dialog for every export format, with a live summary of what gets written. */
export function ExportDialog() {
  const t = useDict();
  const state = useSelector(exportActor, (s) => s.value);
  const { format, raster, error } = useSelector(exportActor, (s) => s.context);
  const glyphs = useEditor((c) => c.glyphs);
  const fontName = useEditor((c) => c.fontName);
  const busy = state === 'exporting';
  const info = FORMATS[format];

  const summary = useMemo(() => {
    if (format !== 'atlas' && format !== 'bmfont') return null;
    const l = layoutAtlas({ ...getProject(), glyphs }, raster);
    return fmt(t.exportSummary, { count: l.cells.length, w: l.width, h: l.height });
  }, [format, raster, glyphs, t]);

  const base = safeFileName(fontName);
  const files = [info.ext, ...info.companions].map((ext) => `${format === 'glyph' ? `${base}_…` : base}.${ext}`).join(', ');
  const close = () => !busy && exportActor.send({ type: 'CLOSE' });

  return (
    <Modal
      open={state !== 'closed'}
      onClose={close}
      title={t.exportTitle}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>
            {t.cancel}
          </Button>
          <Button
            variant="primary"
            icon={busy ? <Spinner size="sm" /> : <Icon name="download" />}
            disabled={busy}
            onClick={() => exportActor.send({ type: 'EXPORT' })}
          >
            {t.exportButton}
          </Button>
        </>
      }
    >
      <div className="export-dialog">
        <RadioGroup<ExportFormat>
          label={t.exportTitle}
          hideLabel
          value={format}
          onChange={(f) => exportActor.send({ type: 'SET_FORMAT', format: f })}
          options={ORDER.map((id) => ({
            value: id,
            label: t[FORMAT_LABEL[id]],
            description: t[DESC[id]],
            badge: id === 'ttf' ? <Badge tone="accent" dot={false}>{t.recommended}</Badge> : undefined,
          }))}
        />
        <div className="export-dialog__side">
          {info.raster && (
            <RasterFields format={format} raster={raster} onChange={(patch) => exportActor.send({ type: 'SET_RASTER', patch })} />
          )}
          {info.raster && <ExportPreview format={format} raster={raster} />}
          <div className="export-dialog__summary">
            {summary && <div>{summary}</div>}
            <div className="muted">{fmt(t.exportFiles, { files })}</div>
          </div>
          {error && <Banner tone="danger">{fmt(t[error.key], error.params)}</Banner>}
        </div>
      </div>
    </Modal>
  );
}
