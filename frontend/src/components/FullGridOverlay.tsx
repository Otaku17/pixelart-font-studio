import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useEditorStore } from '../state/store';
import { I18N } from '../lib/i18n';

function MiniTile({
  bitmap,
  w,
  h,
  char,
  selected,
  edited,
  onClick,
}: {
  bitmap: Uint8Array;
  w: number;
  h: number;
  char: string;
  selected: boolean;
  edited: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (bitmap[y * w + x]) ctx.fillRect(x, y, 1, 1);
  }, [bitmap, w, h]);

  return (
    <div
      className={`glyph-tile${selected ? ' selected' : ''}${edited ? ' edited' : ''}`}
      onClick={onClick}
    >
      <canvas ref={canvasRef} />
      <div className="lbl">{char === ' ' ? '␣' : char}</div>
    </div>
  );
}

export function FullGridOverlay({ onClose }: { onClose: () => void }) {
  const lang = useEditorStore((s) => s.lang);
  const order = useEditorStore((s) => s.order);
  const glyphs = useEditorStore((s) => s.glyphs);
  const gridW = useEditorStore((s) => s.gridW);
  const gridH = useEditorStore((s) => s.gridH);
  const currentKey = useEditorStore((s) => s.currentKey);
  const selectGlyph = useEditorStore((s) => s.selectGlyph);
  const t = I18N[lang];
  const [filter, setFilter] = useState('');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filterLower = filter.trim().toLowerCase();
  const visible = order.filter((key) => {
    if (!filterLower) return true;
    const g = glyphs[key];
    if (!g) return false;
    const cpHex = 'u+' + parseInt(key, 10).toString(16);
    return (
      (g.char || '').toLowerCase().includes(filterLower) ||
      cpHex.includes(filterLower)
    );
  });

  return (
    <div
      className="full-grid-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="full-grid-header">
        <div className="full-grid-title">{t.fullscreenPreviewTitle}</div>
        <div className="full-grid-search-wrap">
          <Icon name="search" />
          <input
            className="text-input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t.filterPlaceholder}
            autoFocus
          />
        </div>
        <button className="ghost-btn" onClick={onClose}>
          <Icon name="x" />
        </button>
      </div>
      <div className="full-grid">
        {order.length === 0 ? (
          <div className="empty-hint">{t.noFont}</div>
        ) : (
          visible.map((key) => {
            const g = glyphs[key];
            if (!g) return null;
            return (
              <MiniTile
                key={key}
                bitmap={g.bitmap}
                w={gridW}
                h={gridH}
                char={g.char}
                selected={key === currentKey}
                edited={g.edited}
                onClick={() => {
                  selectGlyph(key);
                  onClose();
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
