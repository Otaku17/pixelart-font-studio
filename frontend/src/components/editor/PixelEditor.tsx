import { useActorRef, useSelector } from '@xstate/react';
import { useEffect, useRef, type PointerEvent } from 'react';
import { pointerMachine } from '../../machines/pointer/machine';
import { editor, getEditor, useCurrentGlyph, useEditor } from '../../state/editor/store';
import { usePrefs } from '../../state/prefs';
import { drawGrid } from './drawGrid';
import { useCanvasShortcuts } from './useCanvasShortcuts';

/** The zoomed pixel grid. Gestures are handled by the pointer state machine. */
export function PixelEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointer = useActorRef(pointerMachine);

  const w = useEditor((c) => c.gridW);
  const h = useEditor((c) => c.gridH);
  const zoom = useEditor((c) => c.zoom);
  const baselineRow = useEditor((c) => c.baselineRow);
  const tool = useEditor((c) => c.tool);
  const currentKey = useEditor((c) => c.currentKey);
  const glyph = useCurrentGlyph();
  const ink = usePrefs((p) => p.ink);
  const paper = usePrefs((p) => p.paper);
  const selection = useSelector(pointer, (s) => s.context.selection);
  const offset = useSelector(pointer, (s) => (s.matches('moving') ? s.context.offset : null));

  useCanvasShortcuts(pointer);

  // A selection only makes sense for the Select tool on the current glyph.
  useEffect(() => {
    pointer.send({ type: 'RESET' });
  }, [tool, currentKey, pointer]);

  useEffect(() => {
    if (canvasRef.current) {
      drawGrid(canvasRef.current, { w, h, zoom, baselineRow, glyph, selection, offset: offset ?? { x: 0, y: 0 }, ink, paper });
    }
  }, [w, h, zoom, baselineRow, glyph, selection, offset, ink, paper]);

  // Releasing outside the canvas still ends the gesture.
  useEffect(() => {
    const up = () => pointer.send({ type: 'UP' });
    document.addEventListener('pointerup', up);
    return () => document.removeEventListener('pointerup', up);
  }, [pointer]);

  // Ctrl/Cmd + wheel zooms the grid instead of the whole page.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      editor.setZoom({ zoom: getEditor().zoom + (e.deltaY > 0 ? -2 : 2) });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  function cell(e: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - rect.left) * (canvas.width / rect.width)) / zoom),
      y: Math.floor(((e.clientY - rect.top) * (canvas.height / rect.height)) / zoom),
    };
  }

  return (
    <div className="canvas-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className={`pixel-canvas${tool === 'select' ? ' select-mode' : ''}`}
        onPointerDown={(e) => {
          canvasRef.current?.setPointerCapture(e.pointerId);
          pointer.send({ type: 'DOWN', erase: e.button === 2, ...cell(e) });
        }}
        onPointerMove={(e) => pointer.send({ type: 'MOVE', ...cell(e) })}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
