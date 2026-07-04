import type { Glyph } from '../types';

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

export function renderGlyphCanvas(
  bitmap: Uint8Array,
  w: number,
  h: number,
): HTMLCanvasElement {
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#000000';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (bitmap[y * w + x]) ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

export function renderAtlasCanvas(
  order: string[],
  glyphs: Record<string, Glyph>,
  tileW: number,
  tileH: number,
): HTMLCanvasElement {
  const cols = Math.ceil(Math.sqrt(order.length || 1));
  const rows = Math.ceil((order.length || 1) / cols);
  const canvas = makeCanvas(cols * tileW, rows * tileH);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';

  order.forEach((key, i) => {
    const g = glyphs[key];
    if (!g) return;
    const cx = (i % cols) * tileW;
    const cy = Math.floor(i / cols) * tileH;
    for (let y = 0; y < tileH; y++) {
      for (let x = 0; x < tileW; x++) {
        if (g.bitmap[y * tileW + x]) ctx.fillRect(cx + x, cy + y, 1, 1);
      }
    }
  });

  return canvas;
}

export function canvasToPngBase64(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('toBlob failed'));
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // strip the "data:image/png;base64," prefix
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }, 'image/png');
  });
}
