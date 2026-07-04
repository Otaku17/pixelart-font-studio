import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../state/store';
import { I18N } from '../lib/i18n';
import {
  blankBitmap,
  setPixel,
  floodFill,
  drawLine,
  drawRect,
  extractRegion,
  clearRegion,
  pasteRegion,
  type Region,
} from '../lib/bitmap';

interface SelectionBounds {
  x0: number;
  y0: number;
  x1: number; // inclusive
  y1: number; // inclusive
}

function normalize(
  a: { x: number; y: number },
  b: { x: number; y: number },
): SelectionBounds {
  return {
    x0: Math.min(a.x, b.x),
    y0: Math.min(a.y, b.y),
    x1: Math.max(a.x, b.x),
    y1: Math.max(a.y, b.y),
  };
}

function insideSelection(x: number, y: number, sel: SelectionBounds) {
  return x >= sel.x0 && x <= sel.x1 && y >= sel.y0 && y <= sel.y1;
}

export function PixelEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const gridW = useEditorStore((s) => s.gridW);
  const gridH = useEditorStore((s) => s.gridH);
  const zoom = useEditorStore((s) => s.zoom);
  const baselineRow = useEditorStore((s) => s.baselineRow);
  const tool = useEditorStore((s) => s.tool);
  const currentKey = useEditorStore((s) => s.currentKey);
  const glyph = useEditorStore((s) =>
    s.currentKey ? s.glyphs[s.currentKey] : null,
  );
  const clipboard = useEditorStore((s) => s.clipboard);
  const setGlyphBitmapLive = useEditorStore((s) => s.setGlyphBitmapLive);
  const commitGlyphBitmap = useEditorStore((s) => s.commitGlyphBitmap);
  const clearCurrentGlyph = useEditorStore((s) => s.clearCurrentGlyph);
  const setClipboardRegion = useEditorStore((s) => s.setClipboardRegion);
  const setZoom = useEditorStore((s) => s.setZoom);

  // drag/interaction refs (mirrors the mutable `state.dragging` etc. from the original app)
  const draggingRef = useRef(false);
  const dragModeRef = useRef<0 | 1>(1);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragBaseRef = useRef<Uint8Array | null>(null); // bitmap snapshot at pointerdown, used as base for line/rect preview
  const strokeBeforeRef = useRef<Uint8Array | null>(null); // bitmap snapshot for undo, pushed once per stroke

  // selection-tool specific state
  const [selection, setSelection] = useState<SelectionBounds | null>(null);
  const interactionRef = useRef<'none' | 'marquee' | 'move'>('none');
  const moveRef = useRef<{
    base: Uint8Array;
    region: Region;
    selX0: number;
    selY0: number;
  } | null>(null);
  const moveOffsetRef = useRef({ dx: 0, dy: 0 });

  // selection is only meaningful while the Select tool is active
  useEffect(() => {
    if (tool !== 'select') setSelection(null);
  }, [tool]);

  useEffect(() => {
    setSelection(null);
  }, [currentKey]);

  // ---- render ----
  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = gridW;
    const h = gridH;
    const z = zoom;
    canvas.width = w * z;
    canvas.height = h * z;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const bitmap = glyph ? glyph.bitmap : blankBitmap(w, h);

    ctx.fillStyle = '#ffffff';
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (bitmap[y * w + x]) ctx.fillRect(x * z, y * z, z, z);
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.32)';
    ctx.beginPath();
    ctx.moveTo(0, baselineRow * z + 0.5);
    ctx.lineTo(w * z, baselineRow * z + 0.5);
    ctx.stroke();

    if (glyph) {
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.moveTo(glyph.advance * z + 0.5, 0);
      ctx.lineTo(glyph.advance * z + 0.5, h * z);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    for (let x = 0; x <= w; x++) {
      ctx.beginPath();
      ctx.moveTo(x * z + 0.5, 0);
      ctx.lineTo(x * z + 0.5, h * z);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * z + 0.5);
      ctx.lineTo(w * z, y * z + 0.5);
      ctx.stroke();
    }

    // selection marquee overlay ("marching ants")
    if (selection) {
      const dx =
        interactionRef.current === 'move' ? moveOffsetRef.current.dx : 0;
      const dy =
        interactionRef.current === 'move' ? moveOffsetRef.current.dy : 0;
      const left = (selection.x0 + dx) * z;
      const top = (selection.y0 + dy) * z;
      const rw = (selection.x1 - selection.x0 + 1) * z;
      const rh = (selection.y1 - selection.y0 + 1) * z;
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(left + 0.5, top + 0.5, rw - 1, rh - 1);
      ctx.setLineDash([4, 3]);
      ctx.lineDashOffset = 4;
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(left + 0.5, top + 0.5, rw - 1, rh - 1);
      ctx.restore();
    }
  }

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridW, gridH, zoom, baselineRow, glyph, selection]);

  function cellFromEvent(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.floor(((e.clientX - rect.left) * scaleX) / zoom),
      y: Math.floor(((e.clientY - rect.top) * scaleY) / zoom),
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!glyph || !currentKey) return;
    const { x, y } = cellFromEvent(e);
    canvasRef.current?.setPointerCapture(e.pointerId);

    // ---- Select tool: start a marquee, or start moving the current selection ----
    if (tool === 'select') {
      if (selection && insideSelection(x, y, selection)) {
        const region = extractRegion(
          glyph.bitmap,
          gridW,
          gridH,
          selection.x0,
          selection.y0,
          selection.x1,
          selection.y1,
        );
        const base = glyph.bitmap.slice();
        clearRegion(
          base,
          gridW,
          gridH,
          selection.x0,
          selection.y0,
          selection.x1,
          selection.y1,
        );
        strokeBeforeRef.current = glyph.bitmap.slice();
        moveRef.current = {
          base,
          region,
          selX0: selection.x0,
          selY0: selection.y0,
        };
        moveOffsetRef.current = { dx: 0, dy: 0 };
        dragStartRef.current = { x, y };
        interactionRef.current = 'move';
        draggingRef.current = true;
      } else {
        dragStartRef.current = { x, y };
        interactionRef.current = 'marquee';
        draggingRef.current = true;
        setSelection(normalize({ x, y }, { x, y }));
      }
      return;
    }

    const isRightClick = e.button === 2;
    const eraseMode = isRightClick || tool === 'eraser';
    const drawVal: 0 | 1 = eraseMode ? 0 : 1;

    if (tool === 'pencil' || tool === 'eraser' || isRightClick) {
      strokeBeforeRef.current = glyph.bitmap.slice();
      const next = glyph.bitmap.slice();
      setPixel(next, x, y, gridW, gridH, drawVal);
      setGlyphBitmapLive(currentKey, next);
      draggingRef.current = true;
      dragModeRef.current = drawVal;
      dragStartRef.current = { x, y };
      return;
    }

    if (tool === 'bucket') {
      const before = glyph.bitmap.slice();
      const after = glyph.bitmap.slice();
      const targetVal = after[y * gridW + x];
      floodFill(after, x, y, gridW, gridH, targetVal, drawVal);
      commitGlyphBitmap(currentKey, before, after);
      return;
    }

    if (tool === 'line' || tool === 'rect') {
      draggingRef.current = true;
      dragStartRef.current = { x, y };
      dragModeRef.current = drawVal;
      strokeBeforeRef.current = glyph.bitmap.slice();
      dragBaseRef.current = glyph.bitmap.slice();
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!draggingRef.current || !glyph || !currentKey) return;
    const { x, y } = cellFromEvent(e);

    if (tool === 'select') {
      if (interactionRef.current === 'marquee' && dragStartRef.current) {
        setSelection(normalize(dragStartRef.current, { x, y }));
      } else if (
        interactionRef.current === 'move' &&
        moveRef.current &&
        dragStartRef.current
      ) {
        const dx = x - dragStartRef.current.x;
        const dy = y - dragStartRef.current.y;
        moveOffsetRef.current = { dx, dy };
        const preview = moveRef.current.base.slice();
        pasteRegion(
          preview,
          gridW,
          gridH,
          moveRef.current.region,
          moveRef.current.selX0 + dx,
          moveRef.current.selY0 + dy,
        );
        setGlyphBitmapLive(currentKey, preview);
      }
      return;
    }

    if (tool === 'pencil' || tool === 'eraser') {
      const next = glyph.bitmap.slice();
      setPixel(next, x, y, gridW, gridH, dragModeRef.current);
      setGlyphBitmapLive(currentKey, next);
      return;
    }

    if (tool === 'line' || tool === 'rect') {
      const start = dragStartRef.current;
      const base = dragBaseRef.current;
      if (!start || !base) return;
      const preview = new Uint8Array(base);
      if (tool === 'line')
        drawLine(
          preview,
          start.x,
          start.y,
          x,
          y,
          gridW,
          gridH,
          dragModeRef.current,
        );
      if (tool === 'rect')
        drawRect(
          preview,
          start.x,
          start.y,
          x,
          y,
          gridW,
          gridH,
          dragModeRef.current,
        );
      setGlyphBitmapLive(currentKey, preview);
    }
  }

  function handlePointerUp() {
    if (!draggingRef.current || !currentKey) return;

    if (tool === 'select') {
      if (interactionRef.current === 'move' && moveRef.current) {
        const { dx, dy } = moveOffsetRef.current;
        const w = gridW;
        const h = gridH;
        const newSel: SelectionBounds = {
          x0: Math.max(0, moveRef.current.selX0 + dx),
          y0: Math.max(0, moveRef.current.selY0 + dy),
          x1: Math.min(
            w - 1,
            moveRef.current.selX0 + dx + moveRef.current.region.w - 1,
          ),
          y1: Math.min(
            h - 1,
            moveRef.current.selY0 + dy + moveRef.current.region.h - 1,
          ),
        };
        setSelection(newSel);
        const before = strokeBeforeRef.current;
        strokeBeforeRef.current = null;
        if (before) {
          const st = useEditorStore.getState();
          const g = st.glyphs[currentKey];
          if (g) commitGlyphBitmap(currentKey, before, g.bitmap);
        }
        moveRef.current = null;
        moveOffsetRef.current = { dx: 0, dy: 0 };
      }
      interactionRef.current = 'none';
      draggingRef.current = false;
      dragStartRef.current = null;
      return;
    }

    draggingRef.current = false;
    dragBaseRef.current = null;
    dragStartRef.current = null;

    const before = strokeBeforeRef.current;
    strokeBeforeRef.current = null;
    if (!before) return;

    const st = useEditorStore.getState();
    const g = st.glyphs[currentKey];
    if (!g) return;
    commitGlyphBitmap(currentKey, before, g.bitmap);
  }

  useEffect(() => {
    document.addEventListener('pointerup', handlePointerUp);
    return () => document.removeEventListener('pointerup', handlePointerUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, tool, selection]);

  // Ctrl/Cmd + mouse wheel zooms the editor instead of letting the browser
  // zoom the whole page (which is what "redraws the whole app" refers to).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const st = useEditorStore.getState();
      const step = e.deltaY > 0 ? -2 : 2;
      st.setZoom(st.zoom + step);
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selection-tool keyboard shortcuts: copy / cut / paste / delete-region / escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if (!currentKey) return;

      const mod = e.ctrlKey || e.metaKey;

      if (tool === 'select' && e.key === 'Escape') {
        setSelection(null);
        return;
      }

      if (tool !== 'select') return;

      const st = useEditorStore.getState();
      const g = st.glyphs[currentKey];
      if (!g) return;

      if (mod && (e.key === 'c' || e.key === 'C')) {
        if (!selection) return;
        e.preventDefault();
        const region = extractRegion(
          g.bitmap,
          gridW,
          gridH,
          selection.x0,
          selection.y0,
          selection.x1,
          selection.y1,
        );
        setClipboardRegion(region);
        st.showToast(I18N[lang].toastSelectionCopied);
        return;
      }

      if (mod && (e.key === 'x' || e.key === 'X')) {
        if (!selection) return;
        e.preventDefault();
        const region = extractRegion(
          g.bitmap,
          gridW,
          gridH,
          selection.x0,
          selection.y0,
          selection.x1,
          selection.y1,
        );
        setClipboardRegion(region);
        const before = g.bitmap.slice();
        const after = before.slice();
        clearRegion(
          after,
          gridW,
          gridH,
          selection.x0,
          selection.y0,
          selection.x1,
          selection.y1,
        );
        commitGlyphBitmap(currentKey, before, after);
        return;
      }

      if (mod && (e.key === 'v' || e.key === 'V')) {
        if (!clipboard) return;
        e.preventDefault();
        const atX = selection ? selection.x0 : 0;
        const atY = selection ? selection.y0 : 0;
        const before = g.bitmap.slice();
        const after = before.slice();
        pasteRegion(after, gridW, gridH, clipboard, atX, atY);
        commitGlyphBitmap(currentKey, before, after);
        setSelection({
          x0: atX,
          y0: atY,
          x1: Math.min(gridW - 1, atX + clipboard.w - 1),
          y1: Math.min(gridH - 1, atY + clipboard.h - 1),
        });
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selection) {
          const before = g.bitmap.slice();
          const after = before.slice();
          clearRegion(
            after,
            gridW,
            gridH,
            selection.x0,
            selection.y0,
            selection.x1,
            selection.y1,
          );
          commitGlyphBitmap(currentKey, before, after);
        } else {
          clearCurrentGlyph();
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, selection, currentKey, clipboard, gridW, gridH]);

  const lang = useEditorStore((s) => s.lang);

  return (
    <div className="canvas-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className={`pixel-canvas${tool === 'select' ? ' select-mode' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
