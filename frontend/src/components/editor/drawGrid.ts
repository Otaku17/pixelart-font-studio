import { blankBitmap, paintBitmap, type Glyph } from '@pfs/core';
import type { Bounds, Cell } from '../../machines/pointer/geometry';
import { contrastOn } from '../../utils/contrast';

export interface GridView {
  w: number;
  h: number;
  zoom: number;
  baselineRow: number;
  glyph: Glyph | null;
  selection: Bounds | null;
  /** Offset of the selection while it is being dragged. */
  offset: Cell;
  ink: string;
  paper: string;
}

function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

/** Paints pixels, baseline, advance marker, grid and selection marquee. */
export function drawGrid(canvas: HTMLCanvasElement, v: GridView) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { w, h, zoom: z } = v;
  canvas.width = w * z;
  canvas.height = h * z;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = v.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = v.ink;
  paintBitmap(ctx, v.glyph ? v.glyph.bitmap : blankBitmap(w, h), w, h, 0, 0, z);

  ctx.strokeStyle = contrastOn(v.paper, 0.4);
  line(ctx, 0, v.baselineRow * z + 0.5, w * z, v.baselineRow * z + 0.5);

  if (v.glyph) {
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = contrastOn(v.paper, 0.6);
    line(ctx, v.glyph.advance * z + 0.5, 0, v.glyph.advance * z + 0.5, h * z);
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = contrastOn(v.paper, 0.09);
  for (let x = 0; x <= w; x++) line(ctx, x * z + 0.5, 0, x * z + 0.5, h * z);
  for (let y = 0; y <= h; y++) line(ctx, 0, y * z + 0.5, w * z, y * z + 0.5);

  if (v.selection) {
    const s = v.selection;
    const left = (s.x0 + v.offset.x) * z;
    const top = (s.y0 + v.offset.y) * z;
    const rw = (s.x1 - s.x0 + 1) * z;
    const rh = (s.y1 - s.y0 + 1) * z;
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(left + 0.5, top + 0.5, rw - 1, rh - 1);
    ctx.lineDashOffset = 4;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(left + 0.5, top + 0.5, rw - 1, rh - 1);
    ctx.restore();
  }
}
