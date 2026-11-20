import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { TitleBar } from 'soft-dark-ui';
import { Environment, Quit, WindowIsMaximised, WindowMinimise, WindowToggleMaximise } from '../../../wailsjs/runtime/runtime';
import logoSvg from '../../assets/logo.svg?raw';
import { isDesktop } from '../../services/fileIO';
import { useEditor } from '../../state/editor/store';
import { usePrefs } from '../../state/prefs';
import type { ResolvedTheme } from '../../state/theme';

/** Accent color of each theme (see soft-dark-ui tokens and themes.css). */
const LOGO_COLOR: Record<ResolvedTheme, string> = {
  dark: '#7fa7e8',
  light: '#3b6cc2',
  sepia: '#8a5a24',
  contrast: '#ffe000',
};

const CONTROLS: NonNullable<ComponentProps<typeof TitleBar>['controls']> = {
  minimise: WindowMinimise,
  toggleMaximise: WindowToggleMaximise,
  close: Quit,
  isMaximised: WindowIsMaximised,
};

/** The app icon (build/windows/icon.ico) as a transparent outline, in the theme accent. */
function useLogo(): string {
  const theme = usePrefs((p) => p.resolvedTheme);
  return useMemo(() => {
    const svg = logoSvg.replace(/currentColor/g, LOGO_COLOR[theme]);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [theme]);
}

/** Frameless window chrome from Soft Dark UI (the native frame is disabled in main.go). */
export function AppTitleBar() {
  const logo = useLogo();
  const fontName = useEditor((c) => c.fontName);
  const [platform, setPlatform] = useState<'windows' | 'mac'>('windows');

  useEffect(() => {
    if (!isDesktop()) return;
    void Environment().then((env) => setPlatform(env.platform === 'darwin' ? 'mac' : 'windows'));
  }, []);

  return (
    // Double-click to maximise is handled natively by Wails drag regions.
    <div className="app-titlebar">
      <TitleBar
        appName="PixelArt Font Studio"
        title={fontName}
        logo={logo}
        platform={platform}
        controls={isDesktop() ? CONTROLS : undefined}
      />
    </div>
  );
}
