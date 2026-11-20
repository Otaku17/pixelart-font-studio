import type { Project } from '../types';
import type { AtlasLayout, RasterOptions } from '../export/atlas';

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

/** Paints a 0/1 bitmap at (ox, oy), one `scale`×`scale` block per pixel. */
export function paintBitmap(
  ctx: CanvasRenderingContext2D,
  bitmap: Uint8Array,
  w: number,
  h: number,
  ox = 0,
  oy = 0,
  scale = 1,
) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (bitmap[y * w + x]) ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  }
}

function prepare(canvas: HTMLCanvasElement, background: string | null) {
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return ctx;
}

export function renderGlyphCanvas(
  bitmap: Uint8Array,
  w: number,
  h: number,
  opts: Pick<RasterOptions, 'scale' | 'ink' | 'background'>,
): HTMLCanvasElement {
  const s = Math.max(1, Math.round(opts.scale));
  const canvas = makeCanvas(w * s, h * s);
  const ctx = prepare(canvas, opts.background);
  ctx.fillStyle = opts.ink;
  paintBitmap(ctx, bitmap, w, h, 0, 0, s);
  return canvas;
}

export function renderAtlasCanvas(
  project: Project,
  layout: AtlasLayout,
  opts: Pick<RasterOptions, 'ink' | 'background'>,
): HTMLCanvasElement {
  const canvas = makeCanvas(layout.width, layout.height);
  const ctx = prepare(canvas, opts.background);
  ctx.fillStyle = opts.ink;
  for (const cell of layout.cells) {
    const g = project.glyphs[cell.key];
    if (g) paintBitmap(ctx, g.bitmap, project.gridW, project.gridH, cell.x, cell.y, layout.scale);
  }
  return canvas;
}

export function canvasToPngBase64(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('toBlob failed'));
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }, 'image/png');
  });
}
