import { useCallback, useEffect } from 'react';
import { EmptyState, Icon, IconButton, SearchInput } from 'soft-dark-ui';
import { editor, useEditor } from '../../state/editor/store';
import { useDict } from '../../state/prefs';
import { ui } from '../../state/ui';
import { GlyphTile } from './GlyphTile';
import { useGlyphFilter } from './useGlyphFilter';

/** Fullscreen glyph browser: pick a glyph and jump back to the editor. */
export function FullGridOverlay() {
  const t = useDict();
  const glyphs = useEditor((c) => c.glyphs);
  const currentKey = useEditor((c) => c.currentKey);
  const gridW = useEditor((c) => c.gridW);
  const gridH = useEditor((c) => c.gridH);
  const { filter, setFilter, visible, total } = useGlyphFilter();

  const pick = useCallback((key: string) => {
    editor.selectGlyph({ key });
    ui.close();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && ui.close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="full-grid-overlay" onPointerDown={(e) => e.target === e.currentTarget && ui.close()}>
      <div className="full-grid-header">
        <div className="full-grid-title">{t.fullscreenPreviewTitle}</div>
        <div className="full-grid-search">
          <SearchInput value={filter} onChange={setFilter} placeholder={t.filterPlaceholder} autoFocus />
        </div>
        <IconButton label={t.close} onClick={() => ui.close()}>
          <Icon name="x" />
        </IconButton>
      </div>
      {total === 0 ? (
        <EmptyState icon="grid" title={t.noFont} />
      ) : (
        <div className="full-grid">
          {visible.map((key) => {
            const g = glyphs[key];
            return g ? (
              <GlyphTile
                key={key}
                id={key}
                bitmap={g.bitmap}
                w={gridW}
                h={gridH}
                char={g.char}
                selected={key === currentKey}
                edited={g.edited}
                onSelect={pick}
              />
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
