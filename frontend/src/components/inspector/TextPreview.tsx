import { useEffect, useRef, useState } from 'react';
import { paintBitmap } from '@pfs/core';
import { Input, Slider } from 'soft-dark-ui';
import { editor, getEditor, useEditor } from '../../state/editor/store';
import { prefsStore, useDict, usePrefs } from '../../state/prefs';

/** Live text rendering with the current glyphs. */
export function TextPreview() {
  const t = useDict();
  const gridW = useEditor((c) => c.gridW);
  const gridH = useEditor((c) => c.gridH);
  const glyphs = useEditor((c) => c.glyphs);

  const [text, setText] = useState('PixelArt');
  const fg = usePrefs((p) => p.ink);
  const bg = usePrefs((p) => p.paper);
  const [scale, setScale] = useState(3);
  const [gap, setGap] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Typing a character that has no glyph yet creates an empty one to draw.
  useEffect(() => {
    for (const ch of text) {
      const cp = ch.codePointAt(0);
      if (cp !== undefined && !getEditor().glyphs[String(cp)]) editor.ensureGlyph({ cp, char: ch });
    }
  }, [text]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = fg;
    let x = 2;
    for (const ch of text) {
      const g = glyphs[String(ch.codePointAt(0))];
      if (!g) continue;
      paintBitmap(ctx, g.bitmap, gridW, gridH, x, 0, scale);
      x += (g.advance + gap) * scale;
      if (x > canvas.width - gridW * scale) break;
    }
  }, [text, fg, bg, scale, gap, gridW, gridH, glyphs]);

  return (
    <div className="block text-preview">
      <Input aria-label={t.previewTitle} value={text} spellCheck={false} onChange={(e) => setText(e.target.value)} />
      <canvas ref={canvasRef} className="preview-canvas" width={276} height={90} />
      <Slider label={t.previewZoom} min={1} max={10} value={scale} onChange={setScale} format={(v) => `×${v}`} />
      <Slider label={t.previewSpacing} min={0} max={6} value={gap} onChange={setGap} format={(v) => `${v}px`} />
      <div className="color-row">
        <label>
          {t.previewInk}
          <input type="color" value={fg} onChange={(e) => prefsStore.trigger.setColors({ ink: e.target.value })} />
        </label>
        <label>
          {t.previewPaper}
          <input type="color" value={bg} onChange={(e) => prefsStore.trigger.setColors({ paper: e.target.value })} />
        </label>
      </div>
    </div>
  );
}
