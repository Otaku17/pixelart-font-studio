# PixelArt Font Studio

PixelArt Font Studio is a desktop font editor built with Wails, Go, React, and TypeScript. It lets you design pixel-based glyphs, import existing fonts, preview text, and export projects or font assets.

## Overview

This project is a desktop port of the original PixelArt Font Studio concept. The app preserves the core editing experience while providing a modern interface and native desktop capabilities.

### Included features

- Pixel-by-pixel drawing tools: pencil, eraser, bucket, line, rectangle, and selection
- Glyph-level undo and redo
- Horizontal and vertical mirroring, shifting, inversion, and clearing
- Font import from .ttf, .otf, and .woff files with native-size detection and rasterization
- Live text preview with zoom, spacing, and ink/paper controls
- Export options for project JSON, glyph PNG, atlas PNG, and TTF font files
- Localization support for multiple languages
- Fullscreen preview and glyph search experience

## Project structure

```text
pixelart-font-studio-wails/
├── app.go                 # Wails backend entry point and native file dialogs
├── main.go                # Bootstrap entry point for the desktop app
├── wails.json             # Wails project configuration
├── go.mod                 # Go module definition
├── README.md              # Project documentation
└── frontend/
    ├── src/
    │   ├── components/     # UI components such as the toolbar, editor, menus, and modals
    │   ├── lib/            # Rendering, file I/O, font import/export, i18n, and theme helpers
    │   ├── state/          # Zustand store for editor state and actions
    │   ├── assets/         # Locale JSON files and app assets
    │   └── types.ts        # Shared TypeScript types
    ├── package.json        # Frontend dependencies and scripts
    └── wailsjs/            # Generated Wails bindings
```

## Requirements

- Go 1.22 or newer
- Node.js 18+ (LTS recommended)
- Wails CLI v2

Install the Wails CLI with:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

## Development

Start the full desktop app with hot reload:

```bash
wails dev
```

This runs the app in development mode and regenerates the frontend bindings from the exported Go methods in [app.go](app.go).

To run only the frontend in a browser:

```bash
cd frontend
npm install
npm run dev
```

In browser mode, the app falls back to browser-based file upload/download behavior when Wails bindings are unavailable.

## Production build

Build the native desktop application:

```bash
wails build
```

The output is placed in the build directory for the target platform.

## Automatic updates

The app can check GitHub Releases for a newer version:

- a lightweight check runs on startup and is cached for 24 hours to avoid GitHub API spam
- the update button in the toolbar triggers a manual check and download when the user clicks it
- if there is no network access or no matching release asset for the current platform, the app simply ignores the update request

The update flow targets the repository at https://github.com/Otaku17/pixelart-font-studio and downloads the matching release asset into the local cache for the current platform.

## CI / release automation

A GitHub Actions workflow is included in [.github/workflows/build.yml](.github/workflows/build.yml) to build the desktop app for Linux, macOS, and Windows automatically on push, pull requests, or manual dispatch.

## Technical notes

- The Wails bindings in the frontend stub files are normal placeholders for development and will be regenerated automatically during the first build or run.
- Font rasterization and TTF export logic were implemented to preserve the behavior of the original editor as closely as possible.
- The app is designed to be extensible: rendering helpers, import/export logic, and the editor store are separated so future changes remain easier to maintain.

## Contributing

Contributions are welcome. A good workflow is:

1. Start the app in development mode.
2. Make focused changes and keep the UI behavior consistent.
3. Verify the frontend build before submitting changes.

```bash
cd frontend
npm run build
```
