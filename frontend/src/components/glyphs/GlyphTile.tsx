import { memo, useEffect, useRef } from 'react';
import { paintBitmap } from '@pfs/core';
import { Icon, IconButton } from 'soft-dark-ui';
import { editor } from '../../state/editor/store';
import { useDict, usePrefs } from '../../state/prefs';
import { contrastOn } from '../../utils/contrast';

interface GlyphTileProps {
  id: string;
  bitmap: Uint8Array;
  w: number;
  h: number;
  char: string;
  selected: boolean;
  edited: boolean;
  /** Must be stable (not recreated per render) for memo to help. */
  onSelect: (id: string) => void;
  /** Shows the copy / delete hover buttons. */
  withActions?: boolean;
}

/** Thumbnail of one glyph; memoized so drawing on a glyph repaints one tile only. */
export const GlyphTile = memo(function GlyphTile({ id, bitmap, w, h, char, selected, edited, onSelect, withActions }: GlyphTileProps) {
  const t = useDict();
  const ink = usePrefs((p) => p.ink);
  const paper = usePrefs((p) => p.paper);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = ink;
    paintBitmap(ctx, bitmap, w, h);
  }, [bitmap, w, h, ink]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      className={`glyph-tile${selected ? ' selected' : ''}${edited ? ' edited' : ''}`}
      style={{ background: paper }}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(id)}
    >
      {withActions && (
        <div className="glyph-tile__actions" onClick={(e) => e.stopPropagation()}>
          <IconButton size="sm" label={t.copyGlyph} onClick={() => editor.copyGlyph({ key: id })}>
            <Icon name="copy" />
          </IconButton>
          <IconButton size="sm" label={t.deleteGlyph} onClick={() => editor.deleteGlyph({ key: id })}>
            <Icon name="x" />
          </IconButton>
        </div>
      )}
      <canvas ref={canvasRef} />
      <div className="glyph-tile__label" style={{ color: contrastOn(paper, 0.55) }}>{char === ' ' ? '␣' : char}</div>
    </div>
  );
});
