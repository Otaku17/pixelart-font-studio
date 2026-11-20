import type { Project } from '../types';
import { ORIGIN_COLUMN } from '../font/ttf';
import type { AtlasLayout } from './atlas';

const quote = (s: string) => `"${s.replace(/"/g, "'")}"`;

/**
 * AngelCode BMFont descriptor (text variant), read by Godot, Phaser, Unity
 * (TextMesh Pro importers), LÖVE, MonoGame, libGDX, Construct…
 */
export function buildBMFont(project: Project, layout: AtlasLayout, pageFile: string): string {
  const s = layout.scale;
  const lines = [
    `info face=${quote(project.fontName || 'PixelFont')} size=${layout.cellH} bold=0 italic=0 charset="" unicode=1 stretchH=100 smooth=0 aa=1 padding=0,0,0,0 spacing=0,0`,
    `common lineHeight=${layout.cellH} base=${project.baselineRow * s} scaleW=${layout.width} scaleH=${layout.height} pages=1 packed=0`,
    `page id=0 file=${quote(pageFile)}`,
    `chars count=${layout.cells.length}`,
  ];
  for (const c of layout.cells) {
    lines.push(
      `char id=${c.codepoint} x=${c.x} y=${c.y} width=${layout.cellW} height=${layout.cellH} xoffset=${-ORIGIN_COLUMN * s} yoffset=0 xadvance=${c.advance} page=0 chnl=15`,
    );
  }
  return lines.join('\n') + '\n';
}
