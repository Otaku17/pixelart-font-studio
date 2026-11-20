import { StatusBar, StatusBarItem, StatusDot } from 'soft-dark-ui';
import { editor, useCurrentGlyph, useEditor } from '../../state/editor/store';
import { useDict } from '../../state/prefs';

/** Bottom bar: current glyph, advance width, baseline, zoom, unsaved state. */
export function EditorStatus() {
  const t = useDict();
  const currentKey = useEditor((c) => c.currentKey);
  const gridW = useEditor((c) => c.gridW);
  const gridH = useEditor((c) => c.gridH);
  const baselineRow = useEditor((c) => c.baselineRow);
  const zoom = useEditor((c) => c.zoom);
  const dirty = useEditor((c) => c.dirty);
  const glyph = useCurrentGlyph();

  const left =
    glyph && currentKey ? (
      <>
        <StatusBarItem variant="accent">
          <b className="status-char">{glyph.char === ' ' ? '␣' : glyph.char}</b>
          U+{parseInt(currentKey, 10).toString(16).toUpperCase().padStart(4, '0')}
        </StatusBarItem>
        <label className="status-advance">
          {t.advanceWidth}
          <input
            type="range"
            min={1}
            max={gridW}
            value={glyph.advance}
            onChange={(e) => editor.setAdvance({ value: parseInt(e.target.value, 10) })}
          />
          <span>{glyph.advance}px</span>
        </label>
        <StatusBarItem optional>
          {t.baseline} : {baselineRow}px
        </StatusBarItem>
      </>
    ) : (
      <StatusBarItem>{t.noGlyphSelected}</StatusBarItem>
    );

  return (
    <StatusBar
      left={left}
      right={
        <>
          {dirty && <StatusDot tone="warning">{t.unsaved}</StatusDot>}
          <StatusBarItem optional>
            {t.grid} {gridW}×{gridH}
          </StatusBarItem>
          <StatusBarItem icon="search" label={t.zoomHint}>
            {zoom}px
          </StatusBarItem>
        </>
      }
    />
  );
}
