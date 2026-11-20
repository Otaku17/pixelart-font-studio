import { useEffect } from 'react';
import { WindowSetTitle } from '../../wailsjs/runtime/runtime';
import { isDesktop } from '../services/fileIO';
import { useEditor } from '../state/editor/store';

/** "Font name — PixelArt Font Studio" (taskbar / Alt+Tab). Unsaved changes show in the status bar. */
export function useWindowTitle() {
  const fontName = useEditor((c) => c.fontName);

  useEffect(() => {
    const title = `${fontName} — PixelArt Font Studio`;
    document.title = title;
    if (isDesktop()) WindowSetTitle(title);
  }, [fontName]);
}
