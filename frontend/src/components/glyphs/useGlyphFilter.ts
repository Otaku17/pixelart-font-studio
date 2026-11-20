import { useMemo, useState } from 'react';
import { useEditor } from '../../state/editor/store';

/** Filters glyph keys by character or "U+XXXX" codepoint. */
export function useGlyphFilter() {
  const order = useEditor((c) => c.order);
  const glyphs = useEditor((c) => c.glyphs);
  const [filter, setFilter] = useState('');

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return order;
    return order.filter((key) => {
      const g = glyphs[key];
      if (!g) return false;
      const hex = parseInt(key, 10).toString(16);
      return g.char.toLowerCase().includes(q) || `u+${hex}`.includes(q) || `u+${hex.padStart(4, '0')}`.includes(q);
    });
  }, [filter, order, glyphs]);

  return { filter, setFilter, visible, total: order.length };
}
