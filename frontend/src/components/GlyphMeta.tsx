import { Icon } from './Icon';
import { useEditorStore } from '../state/store';
import { I18N } from '../lib/i18n';

export function GlyphMeta() {
  const lang = useEditorStore((s) => s.lang);
  const currentKey = useEditorStore((s) => s.currentKey);
  const glyph = useEditorStore((s) =>
    s.currentKey ? s.glyphs[s.currentKey] : null,
  );
  const gridW = useEditorStore((s) => s.gridW);
  const baselineRow = useEditorStore((s) => s.baselineRow);
  const setAdvance = useEditorStore((s) => s.setAdvance);
  const zoom = useEditorStore((s) => s.zoom);
  const t = I18N[lang];

  if (!glyph || !currentKey) {
    return (
      <div className="glyph-meta">
        {t.noGlyphSelected}
        <span className="zoom-hint">
          <Icon name="zoomIn" /> {zoom}px — {t.zoomHint}
        </span>
      </div>
    );
  }

  const cp = parseInt(currentKey, 10);

  return (
    <div className="glyph-meta">
      <b>{glyph.char === ' ' ? '␣' : glyph.char}</b>
      <span>U+{cp.toString(16).toUpperCase().padStart(4, '0')}</span>
      <span className="baseline-row">
        {t.baseline} : {baselineRow}px
      </span>
      <span className="advance-row">
        {t.advanceWidth} : <span>{glyph.advance}</span>px&nbsp;
        <input
          type="range"
          min={1}
          max={gridW}
          value={glyph.advance}
          onChange={(e) => setAdvance(parseInt(e.target.value, 10))}
        />
      </span>
      <span className="zoom-hint">
        <Icon name="zoomIn" /> {zoom}px
      </span>
    </div>
  );
}
