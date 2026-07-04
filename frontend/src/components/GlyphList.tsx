import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useEditorStore } from '../state/store';
import { I18N } from '../lib/i18n';

function GlyphTile({
  bitmap,
  w,
  h,
  char,
  selected,
  edited,
  onClick,
  onDelete,
  onDuplicate,
}: {
  bitmap: Uint8Array;
  w: number;
  h: number;
  char: string;
  selected: boolean;
  edited: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
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
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (bitmap[y * w + x]) ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [bitmap, w, h]);

  return (
    <div
      className={`glyph-tile${selected ? ' selected' : ''}${edited ? ' edited' : ''}`}
      onClick={onClick}
    >
      {onDelete && (
        <button
          className="del-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Supprimer"
        >
          <Icon name="x" />
        </button>
      )}
      {onDuplicate && (
        <button
          className="copy-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Copier"
        >
          <Icon name="copy" />
        </button>
      )}
      <canvas ref={canvasRef} />
      <div className="lbl">{char === ' ' ? '␣' : char}</div>
    </div>
  );
}

export function GlyphList() {
  const lang = useEditorStore((s) => s.lang);
  const order = useEditorStore((s) => s.order);
  const glyphs = useEditorStore((s) => s.glyphs);
  const currentKey = useEditorStore((s) => s.currentKey);
  const gridW = useEditorStore((s) => s.gridW);
  const gridH = useEditorStore((s) => s.gridH);
  const clipboard = useEditorStore((s) => s.clipboard);
  const selectGlyph = useEditorStore((s) => s.selectGlyph);
  const addGlyphByChar = useEditorStore((s) => s.addGlyphByChar);
  const deleteGlyph = useEditorStore((s) => s.deleteGlyph);
  const copyGlyphToClipboard = useEditorStore((s) => s.copyGlyphToClipboard);
  const pasteAsNewGlyph = useEditorStore((s) => s.pasteAsNewGlyph);
  const t = I18N[lang];

  const [filter, setFilter] = useState('');
  const [newChar, setNewChar] = useState('');

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
    <aside className="glyph-panel">
      <div className="panel-head">
        {t.glyphs}
        <span>{order.length}</span>
      </div>
      <div className="search-wrap">
        <Icon name="search" />
        <input
          className="text-input"
          placeholder={t.filterPlaceholder}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {order.length === 0 ? (
        <div className="empty-hint">{t.noFont}</div>
      ) : (
        <div className="glyph-grid">
          {visible.map((key) => {
            const g = glyphs[key];
            if (!g) return null;
            return (
              <GlyphTile
                key={key}
                bitmap={g.bitmap}
                w={gridW}
                h={gridH}
                char={g.char}
                selected={key === currentKey}
                edited={g.edited}
                onClick={() => selectGlyph(key)}
                onDelete={() => deleteGlyph(key)}
                onDuplicate={() => copyGlyphToClipboard(key)}
              />
            );
          })}
        </div>
      )}

      <div className="add-glyph">
        <input
          className="text-input"
          maxLength={2}
          placeholder="A"
          value={newChar}
          onChange={(e) => setNewChar(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newChar) {
              addGlyphByChar(newChar);
              setNewChar('');
            }
          }}
        />
        <button
          onClick={() => {
            if (newChar) {
              addGlyphByChar(newChar);
              setNewChar('');
            }
          }}
        >
          <Icon name="plus" /> {t.addGlyph}
        </button>
        <button
          disabled={!clipboard}
          title={clipboard ? t.pasteAsNew : t.clipboardEmpty}
          onClick={() => {
            if (newChar && clipboard) {
              pasteAsNewGlyph(newChar);
              setNewChar('');
            }
          }}
        >
          <Icon name="clipboard" />
        </button>
      </div>
    </aside>
  );
}
