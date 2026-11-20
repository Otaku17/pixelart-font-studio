import type { TransformName } from '@pfs/core';
import { IconButton, Toolbar, ToolbarSeparator } from 'soft-dark-ui';
import { editor, useEditor, type Tool } from '../../state/editor/store';
import { useDict } from '../../state/prefs';
import { ui } from '../../state/ui';
import { AppIcon } from '../common/AppIcon';

const TOOLS: { tool: Tool; icon: string; key: string }[] = [
  { tool: 'pencil', icon: 'pencil', key: 'B' },
  { tool: 'eraser', icon: 'eraser', key: 'E' },
  { tool: 'bucket', icon: 'bucket', key: 'G' },
  { tool: 'line', icon: 'line', key: 'L' },
  { tool: 'rect', icon: 'rect', key: 'R' },
  { tool: 'select', icon: 'select', key: 'M' },
];

const TRANSFORM_GROUPS: { name: TransformName; icon: string }[][] = [
  [
    { name: 'mirrorH', icon: 'mirrorH' },
    { name: 'mirrorV', icon: 'mirrorV' },
    { name: 'invert', icon: 'invert' },
  ],
  [
    { name: 'shiftLeft', icon: 'left' },
    { name: 'shiftRight', icon: 'right' },
    { name: 'shiftUp', icon: 'up' },
    { name: 'shiftDown', icon: 'down' },
  ],
];

/** Single-letter tool shortcuts, shown in tooltips. */
export const TOOL_KEYS: Record<string, Tool> = Object.fromEntries(TOOLS.map((t) => [t.key.toLowerCase(), t.tool]));

export function EditorToolbar() {
  const t = useDict();
  const tool = useEditor((c) => c.tool);

  return (
    <div className="editor-toolbar">
      <Toolbar label={t.tool}>
        {TOOLS.map(({ tool: id, icon, key }) => (
          <IconButton key={id} label={t.tools[id]} shortcut={key} pressed={tool === id} onClick={() => editor.setTool({ tool: id })}>
            <AppIcon name={icon} />
          </IconButton>
        ))}
        <ToolbarSeparator />
        <IconButton label={t.undo} shortcut="Ctrl Z" onClick={() => editor.undo()}>
          <AppIcon name="undo" />
        </IconButton>
        <IconButton label={t.redo} shortcut="Ctrl Y" onClick={() => editor.redo()}>
          <AppIcon name="redo" />
        </IconButton>
        {TRANSFORM_GROUPS.map((group, i) => (
          <span key={i} className="toolbar-group">
            <ToolbarSeparator />
            {group.map(({ name, icon }) => (
              <IconButton key={name} label={t[name]} onClick={() => editor.transformCurrent({ name })}>
                <AppIcon name={icon} />
              </IconButton>
            ))}
          </span>
        ))}
        <ToolbarSeparator />
        <IconButton label={t.clear} shortcut="Del" onClick={() => editor.clearCurrent()}>
          <AppIcon name="trash" />
        </IconButton>
        <IconButton label={t.fullscreenPreviewTitle} onClick={() => ui.open({ dialog: 'fullGrid' })}>
          <AppIcon name="expand" />
        </IconButton>
      </Toolbar>
    </div>
  );
}
