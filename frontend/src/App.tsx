import { useEffect } from 'react';
import { AppShell } from 'soft-dark-ui';
import { ShortcutsModal } from './components/dialogs/ShortcutsModal';
import { PreferencesModal } from './components/dialogs/PreferencesModal';
import { EditorStatus } from './components/editor/EditorStatus';
import { EditorToolbar } from './components/editor/EditorToolbar';
import { PixelEditor } from './components/editor/PixelEditor';
import { ExportDialog } from './components/export/ExportDialog';
import { FullGridOverlay } from './components/glyphs/FullGridOverlay';
import { GlyphPanel } from './components/glyphs/GlyphPanel';
import { InspectorPanel } from './components/inspector/InspectorPanel';
import { AppHeader } from './components/layout/AppHeader';
import { AppTitleBar } from './components/layout/AppTitleBar';
import { NoticeBridge } from './components/NoticeBridge';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { useWindowTitle } from './hooks/useWindowTitle';
import { updateActor } from './machines/update';
import { prefsStore, usePrefs } from './state/prefs';
import { applyThemeToDocument } from './state/theme';
import { useDialog } from './state/ui';

export default function App() {
  const resolvedTheme = usePrefs((p) => p.resolvedTheme);
  const themePref = usePrefs((p) => p.themePref);
  const dialog = useDialog();

  useGlobalShortcuts();
  useWindowTitle();

  useEffect(() => applyThemeToDocument(resolvedTheme), [resolvedTheme]);

  // Follow live OS theme changes while "System" is selected.
  useEffect(() => {
    if (themePref !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => prefsStore.trigger.systemThemeChanged();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [themePref]);

  // One update check at launch (cached for 24 h by the backend).
  useEffect(() => {
    updateActor.send({ type: 'CHECK', force: false });
  }, []);

  return (
    <>
      <AppShell titlebar={<AppTitleBar />} header={<AppHeader />} sidebar={<GlyphPanel />} aside={<InspectorPanel />} footer={<EditorStatus />}>
        <div className="editor-panel">
          <EditorToolbar />
          <PixelEditor />
        </div>
      </AppShell>
      {dialog === 'fullGrid' && <FullGridOverlay />}
      {dialog === 'prefs' && <PreferencesModal />}
      {dialog === 'shortcuts' && <ShortcutsModal />}
      <ExportDialog />
      <NoticeBridge />
    </>
  );
}
