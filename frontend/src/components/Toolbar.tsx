import { Icon } from './Icon';
import { useEditorStore } from '../state/store';
import { I18N } from '../lib/i18n';
import {
  mirrorHorizontal,
  mirrorVertical,
  shiftLeft,
  shiftRight,
  shiftUp,
  shiftDown,
  invert,
} from '../lib/bitmap';
import { downloadAndInstallUpdate } from '../lib/actions';
import type { Tool } from '../types';

// Zoom used to live here as a slider, but it duplicated the Ctrl/Cmd + mouse
// wheel shortcut on the editor canvas (see PixelEditor.tsx) while eating a
// lot of horizontal space on small windows. The current zoom level is now
// shown as a compact hint in the status bar (GlyphMeta) instead.

const TOOLS: { tool: Tool; icon: string }[] = [
  { tool: 'pencil', icon: 'pencil' },
  { tool: 'eraser', icon: 'eraser' },
  { tool: 'bucket', icon: 'bucket' },
  { tool: 'line', icon: 'line' },
  { tool: 'rect', icon: 'rect' },
  { tool: 'select', icon: 'select' },
];

export function Toolbar({ onOpenFullGrid }: { onOpenFullGrid: () => void }) {
  const lang = useEditorStore((s) => s.lang);
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const transformCurrentGlyph = useEditorStore((s) => s.transformCurrentGlyph);
  const clearCurrentGlyph = useEditorStore((s) => s.clearCurrentGlyph);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const t = I18N[lang];

  return (
    <div className="editor-toolbar">
      {/* Drawing tool selection */}
      <div className="tb-card">
        <span className="tb-card-label">{t.tool}</span>
        <div className="tb-card-body">
          {TOOLS.map(({ tool: tt, icon }) => (
            <button
              key={tt}
              className={`tool-btn${tool === tt ? ' active' : ''}`}
              title={t.tools[tt]}
              onClick={() => setTool(tt)}
            >
              <Icon name={icon} />
            </button>
          ))}
        </div>
      </div>

      {/* Undo / redo history */}
      <div className="tb-card">
        <span className="tb-card-label">{t.historyLabel}</span>
        <div className="tb-card-body">
          <button className="tool-btn" title={t.undo} onClick={() => undo()}>
            <Icon name="undo" />
          </button>
          <button className="tool-btn" title={t.redo} onClick={() => redo()}>
            <Icon name="redo" />
          </button>
        </div>
      </div>

      {/* Mirror + invert (shape transforms that don't move content around) */}
      <div className="tb-card">
        <span className="tb-card-label">{t.mirrorLabel}</span>
        <div className="tb-card-body">
          <button
            className="tool-btn"
            title={t.mirrorH}
            onClick={() =>
              transformCurrentGlyph((dst, src, w, h) =>
                dst.set(mirrorHorizontal(src, w, h)),
              )
            }
          >
            <Icon name="mirrorH" />
          </button>
          <button
            className="tool-btn"
            title={t.mirrorV}
            onClick={() =>
              transformCurrentGlyph((dst, src, w, h) =>
                dst.set(mirrorVertical(src, w, h)),
              )
            }
          >
            <Icon name="mirrorV" />
          </button>
          <button
            className="tool-btn"
            title={t.invert}
            onClick={() =>
              transformCurrentGlyph((dst, src, w, h) =>
                dst.set(invert(src, w, h)),
              )
            }
          >
            <Icon name="invert" />
          </button>
        </div>
      </div>

      {/* Shift content: 4 buttons in a row */}
      <div className="tb-card">
        <span className="tb-card-label">{t.shiftLabel}</span>
        <div className="tb-card-body">
          <button
            className="tool-btn"
            title={t.shiftLeft}
            onClick={() =>
              transformCurrentGlyph((dst, src, w, h) =>
                dst.set(shiftLeft(src, w, h)),
              )
            }
          >
            <Icon name="left" />
          </button>
          <button
            className="tool-btn"
            title={t.shiftRight}
            onClick={() =>
              transformCurrentGlyph((dst, src, w, h) =>
                dst.set(shiftRight(src, w, h)),
              )
            }
          >
            <Icon name="right" />
          </button>
          <button
            className="tool-btn"
            title={t.shiftUp}
            onClick={() =>
              transformCurrentGlyph((dst, src, w, h) =>
                dst.set(shiftUp(src, w, h)),
              )
            }
          >
            <Icon name="up" />
          </button>
          <button
            className="tool-btn"
            title={t.shiftDown}
            onClick={() =>
              transformCurrentGlyph((dst, src, w, h) =>
                dst.set(shiftDown(src, w, h)),
              )
            }
          >
            <Icon name="down" />
          </button>
        </div>
      </div>

      {/* Destructive action, visually isolated */}
      <div className="tb-card danger">
        <span className="tb-card-label">{t.clearLabel}</span>
        <div className="tb-card-body">
          <button
            className="tool-btn"
            title={t.clear}
            onClick={() => clearCurrentGlyph()}
          >
            <Icon name="trash" />
          </button>
        </div>
      </div>

      {/* Fullscreen glyph grid, grouped here with the other editor tools */}
      <div className="tb-card">
        <span className="tb-card-label">{t.viewLabel}</span>
        <div className="tb-card-body">
          <button
            className="tool-btn"
            title={t.fullscreenPreviewTitle}
            onClick={onOpenFullGrid}
          >
            <Icon name="expand" />
          </button>
        </div>
      </div>

      {/* Update the app from the latest GitHub release when available */}
      <div className="tb-card">
        <span className="tb-card-label">{t.updateLabel}</span>
        <div className="tb-card-body">
          <button
            className="tool-btn"
            title={t.updateButton}
            onClick={() => void downloadAndInstallUpdate(true)}
          >
            <Icon name="refresh" />
          </button>
        </div>
      </div>
    </div>
  );
}
