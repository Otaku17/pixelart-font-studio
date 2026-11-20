import { useCallback, useState } from 'react';
import { Badge, Button, EmptyState, Icon, IconButton, Input, SearchInput } from 'soft-dark-ui';
import { editor, useEditor } from '../../state/editor/store';
import { useDict } from '../../state/prefs';
import { GlyphTile } from './GlyphTile';
import { useGlyphFilter } from './useGlyphFilter';

/** Left column: searchable glyph grid plus "add / paste as new glyph". */
export function GlyphPanel() {
  const t = useDict();
  const glyphs = useEditor((c) => c.glyphs);
  const currentKey = useEditor((c) => c.currentKey);
  const gridW = useEditor((c) => c.gridW);
  const gridH = useEditor((c) => c.gridH);
  const hasClipboard = useEditor((c) => c.clipboard !== null);
  const { filter, setFilter, visible, total } = useGlyphFilter();
  const [newChar, setNewChar] = useState('');

  const select = useCallback((key: string) => editor.selectGlyph({ key }), []);

  const add = () => {
    if (!newChar) return;
    editor.addGlyph({ char: newChar });
    setNewChar('');
  };
  const pasteAsNew = () => {
    if (!newChar) return;
    editor.pasteAsNewGlyph({ char: newChar });
    setNewChar('');
  };

  return (
    <aside className="glyph-panel">
      <div className="panel-head">
        {t.glyphs}
        <Badge dot={false}>{total}</Badge>
      </div>
      <div className="panel-pad">
        <SearchInput value={filter} onChange={setFilter} placeholder={t.filterPlaceholder} />
      </div>

      {total === 0 ? (
        <EmptyState icon="grid" title={t.noFont} />
      ) : (
        <div className="glyph-grid">
          {visible.map((key) => {
            const g = glyphs[key];
            if (!g) return null;
            return (
              <GlyphTile
                key={key}
                id={key}
                bitmap={g.bitmap}
                w={gridW}
                h={gridH}
                char={g.char}
                selected={key === currentKey}
                edited={g.edited}
                onSelect={select}
                withActions
              />
            );
          })}
        </div>
      )}

      <div className="add-glyph">
        <Input
          aria-label={t.addGlyph}
          maxLength={2}
          placeholder="A"
          value={newChar}
          onChange={(e) => setNewChar(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <Button size="sm" variant="secondary" icon={<Icon name="plus" />} onClick={add} disabled={!newChar}>
          {t.addGlyph}
        </Button>
        <IconButton label={hasClipboard ? t.pasteAsNew : t.clipboardEmpty} disabled={!hasClipboard || !newChar} onClick={pasteAsNew}>
          <Icon name="copy" />
        </IconButton>
      </div>
    </aside>
  );
}
