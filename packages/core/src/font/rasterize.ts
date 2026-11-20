import opentype from 'opentype.js';

/** Pixel-perfect rendering of a single glyph at the font's native size, aligned to the grid/baseline. */
export function rasterizeGlyph(
  font: opentype.Font,
  glyph: opentype.Glyph,
  gridW: number,
  gridH: number,
  nativeFontSize: number,
  baselineRow: number,
): { bitmap: Uint8Array; advance: number } {
  const off = document.createElement('canvas');
  const canvasSize = nativeFontSize * 4;
  off.width = canvasSize;
  off.height = canvasSize;
  const octx = off.getContext('2d', { willReadFrequently: true })!;
  octx.imageSmoothingEnabled = false;

  const scale = nativeFontSize / font.unitsPerEm;
  const pixelAscender = Math.round(
    (font.ascender || font.unitsPerEm * 0.8) * scale,
  );

  const drawX = nativeFontSize;
  const drawY = nativeFontSize + pixelAscender;

  octx.fillStyle = '#fff';
  octx.fillRect(0, 0, canvasSize, canvasSize);

  try {
    const path = glyph.getPath(drawX, drawY, nativeFontSize);
    path.fill = '#000';
    path.draw(octx);
  } catch {
    // ignore malformed glyph paths
  }

  const imgData = octx.getImageData(0, 0, canvasSize, canvasSize).data;
  const bitmap = new Uint8Array(gridW * gridH);

  const gridStartX = 1; // 1px left padding, kept for parity with TTF export offset
  const gridBaseline = baselineRow;

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const cy = drawY + (gy - gridBaseline);
      const cx = drawX + (gx - gridStartX);

      if (cx >= 0 && cx < canvasSize && cy >= 0 && cy < canvasSize) {
        const idx = (cy * canvasSize + cx) * 4;
        if (imgData[idx] < 128) {
          bitmap[gy * gridW + gx] = 1;
        }
      }
    }
  }

  const advancePx = Math.round((glyph.advanceWidth || font.unitsPerEm) * scale);
  const advance = Math.min(gridW, Math.max(1, gridStartX + advancePx));

  return { bitmap, advance };
}

