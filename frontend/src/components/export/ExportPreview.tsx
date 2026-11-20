import { useEffect, useRef } from 'react';
import { layoutAtlas, renderAtlasCanvas, renderGlyphCanvas, type ExportFormat, type RasterOptions } from '@pfs/core';
import { getProject, useEditor } from '../../state/editor/store';

const MAX_W = 300;
const MAX_H = 120;

interface Props {
  format: ExportFormat;
  raster: RasterOptions;
}

/** The exported image, scaled down to fit; a checkerboard shows transparency. */
export function ExportPreview({ format, raster }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const glyphs = useEditor((c) => c.glyphs);
  const currentKey = useEditor((c) => c.currentKey);

  useEffect(() => {
    const view = ref.current;
    const ctx = view?.getContext('2d');
    if (!view || !ctx) return;
    const project = { ...getProject(), glyphs };
    let image: HTMLCanvasElement | null = null;
    if (format === 'glyph') {
      const g = currentKey ? glyphs[currentKey] : undefined;
      if (g) image = renderGlyphCanvas(g.bitmap, project.gridW, project.gridH, raster);
    } else {
      const layout = layoutAtlas(project, raster);
      if (layout.cells.length) image = renderAtlasCanvas(project, layout, raster);
    }
    if (!image) {
      view.width = view.height = 0;
      return;
    }
    // Integer zoom when the image is small, plain downscale when it is large.
    const fit = Math.min(MAX_W / image.width, MAX_H / image.height);
    const zoom = fit >= 1 ? Math.floor(fit) : fit;
    view.width = Math.max(1, Math.round(image.width * zoom));
    view.height = Math.max(1, Math.round(image.height * zoom));
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, view.width, view.height);
    ctx.drawImage(image, 0, 0, view.width, view.height);
  }, [format, raster, glyphs, currentKey]);

  return (
    <div className="export-preview">
      <canvas ref={ref} />
    </div>
  );
}
