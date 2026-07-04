import { useEffect, useState } from 'react';
import { MenuBar } from './components/MenuBar';
import { Toolbar } from './components/Toolbar';
import { GlyphList } from './components/GlyphList';
import { PixelEditor } from './components/PixelEditor';
import { GlyphMeta } from './components/GlyphMeta';
import { PreviewPanel } from './components/PreviewPanel';
import { FullGridOverlay } from './components/FullGridOverlay';
import { Toast } from './components/Toast';
import { useEditorStore } from './state/store';
import { applyThemeToDocument } from './lib/theme';
import { checkForUpdates } from './lib/actions';

export default function App() {
  const newBlankProject = useEditorStore((s) => s.newBlankProject);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const clearCurrentGlyph = useEditorStore((s) => s.clearCurrentGlyph);
  const themePref = useEditorStore((s) => s.themePref);
  const resolvedTheme = useEditorStore((s) => s.resolvedTheme);
  const [fullGridOpen, setFullGridOpen] = useState(false);

  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (themePref !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () =>
      useEditorStore.setState({ resolvedTheme: mq.matches ? 'light' : 'dark' });
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [themePref]);

  useEffect(() => {
    newBlankProject();
    void checkForUpdates(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform?.toLowerCase().includes('mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === 'Delete') {
        const target = e.target as HTMLElement | null;
        if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
        if (useEditorStore.getState().tool === 'select') return; // handled by PixelEditor's own selection-aware shortcut
        e.preventDefault();
        clearCurrentGlyph();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, clearCurrentGlyph]);

  return (
    <div className="app">
      <MenuBar />
      <div className="workbench">
        <GlyphList />
        <main className="editor-panel">
          <Toolbar onOpenFullGrid={() => setFullGridOpen(true)} />
          <PixelEditor />
          <GlyphMeta />
        </main>
        <PreviewPanel />
      </div>
      {fullGridOpen && (
        <FullGridOverlay onClose={() => setFullGridOpen(false)} />
      )}
      <Toast />
    </div>
  );
}
