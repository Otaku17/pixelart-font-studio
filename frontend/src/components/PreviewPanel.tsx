import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useEditorStore } from '../state/store';
import { I18N } from '../lib/i18n';
import {
  exportProjectJSON,
  exportAtlasPNG,
  exportGlyphPNG,
  exportTTF,
  importFontFile,
  openProjectFile,
} from '../lib/actions';

export function PreviewPanel() {
  const lang = useEditorStore((s) => s.lang);
  const fontName = useEditorStore((s) => s.fontName);
  const gridW = useEditorStore((s) => s.gridW);
  const gridH = useEditorStore((s) => s.gridH);
  const baselineRow = useEditorStore((s) => s.baselineRow);
  const order = useEditorStore((s) => s.order);
  const glyphs = useEditorStore((s) => s.glyphs);
  const ensureGlyph = useEditorStore((s) => s.ensureGlyph);
  const t = I18N[lang];

  const [previewText, setPreviewText] = useState('PixelArt');
  const [fg, setFg] = useState('#0a0a0a');
  const [bg, setBg] = useState('#f4f3f1');
  const [previewZoom, setPreviewZoom] = useState(3);
  const [previewGap, setPreviewGap] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Auto-create any glyph referenced by the preview text that doesn't exist yet
  useEffect(() => {
    for (const ch of previewText) {
      const cp = ch.codePointAt(0);
      if (cp === undefined) continue;
      if (!glyphs[String(cp)]) ensureGlyph(cp, ch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewText, glyphs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixel = previewZoom;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const baseline = Math.round(baselineRow * pixel);
    let x = 2;

    for (const ch of previewText) {
      const cp = ch.codePointAt(0);
      const g = cp !== undefined ? glyphs[String(cp)] : undefined;
      if (!g) continue;

      ctx.fillStyle = fg;
      for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
          if (g.bitmap[gy * gridW + gx]) {
            const px = x + gx * pixel;
            const py = baseline - baselineRow * pixel + gy * pixel;
            ctx.fillRect(px, py, pixel, pixel);
          }
        }
      }

      x += g.advance * pixel + previewGap * pixel;
      if (x > canvas.width - gridW * pixel) break;
    }
  }, [
    previewText,
    fg,
    bg,
    previewZoom,
    previewGap,
    baselineRow,
    gridW,
    gridH,
    glyphs,
  ]);

  return (
    <aside className="inspector-panel">
      <div className="panel-head">{t.fontLabel}</div>
      <div className="block font-info">
        <b>{fontName}</b>
        <br />
        {order.length} {t.glyphs.toLowerCase()}
        <br />
        {t.grid} : {gridW} x {gridH} px
        <br />
        {t.baseline} : {baselineRow}
      </div>

      <div className="panel-head">{t.previewTitle}</div>
      <div className="block">
        <input
          className="text-input"
          value={previewText}
          spellCheck={false}
          onChange={(e) => setPreviewText(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        <canvas
          ref={canvasRef}
          className="preview-canvas"
          width={276}
          height={90}
        />
        <div className="preview-controls">
          <div className="row">
            <span>{t.previewZoom}</span>
            <input
              type="range"
              min={1}
              max={10}
              value={previewZoom}
              style={{ width: 120 }}
              onChange={(e) => setPreviewZoom(parseInt(e.target.value, 10))}
            />
          </div>
          <div className="row">
            <span>{t.previewInk}</span>
            <input
              type="color"
              value={fg}
              onChange={(e) => setFg(e.target.value)}
            />
          </div>
          <div className="row">
            <span>{t.previewPaper}</span>
            <input
              type="color"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
            />
          </div>
          <div className="row">
            <span>{t.previewSpacing}</span>
            <input
              type="range"
              min={0}
              max={6}
              value={previewGap}
              style={{ width: 120 }}
              onChange={(e) => setPreviewGap(parseInt(e.target.value, 10))}
            />
          </div>
        </div>
      </div>

      <div className="panel-head">{t.importExportLabel}</div>
      <div className="block export-row">
        <button onClick={() => importFontFile()}>
          <Icon name="folderOpen" /> {t.openFont}
        </button>
        <button onClick={() => openProjectFile()}>
          <Icon name="fileJson" /> {t.openProject}
        </button>
        <button onClick={() => exportProjectJSON()}>
          <Icon name="save" /> {t.exportProject}
        </button>
        <button onClick={() => exportAtlasPNG()}>
          <Icon name="image" /> {t.exportAtlas}
        </button>
        <button onClick={() => exportGlyphPNG()}>
          <Icon name="imageDown" /> {t.exportGlyph}
        </button>
        <button className="primary" onClick={() => exportTTF()}>
          <Icon name="fileType" /> {t.exportTTF}
        </button>
      </div>
    </aside>
  );
}
