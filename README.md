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
- One export dialog for TTF, BMFont, PNG atlas + JSON, glyph PNG and project files
- Localization support for multiple languages
- Fullscreen preview and glyph search experience

## Project structure

npm workspaces monorepo; the Wails app stays at the root.

```text
pixelart-font-studio/
├── main.go, wails.json       # Wails bootstrap (must stay at the root: Wails builds it, go:embed needs frontend/)
├── backend/                  # Go package bound to the frontend
│   ├── app.go, files.go      # dialogs, file IO, reveal in folder
│   └── update*.go            # GitHub release updater (version embedded from frontend/package.json)
├── package.json              # npm workspaces root (frontend + packages/*)
├── packages/
│   ├── core/                 # @pfs/core: bitmaps, project format, font import, TTF/BMFont/atlas export (+ tests)
│   └── eslint-config/        # @pfs/eslint-config: shared rules, 200 lines max per file
└── frontend/                 # @pfs/desktop: React UI (Soft Dark UI), XState
    ├── src/state/            # @xstate/store stores: editor document, preferences, open dialog
    ├── src/machines/         # XState machines: update, export dialog, canvas pointer gestures
    ├── src/services/         # Wails/browser file IO, export runner, commands
    ├── src/components/       # UI, grouped by area
    └── wailsjs/              # Generated Wails bindings
```

## Export formats

| Format | Files | Use it for |
|---|---|---|
| TrueType | `.ttf` | Installing the font anywhere (PSDK, RPG Maker, OS, browsers) |
| BMFont | `.fnt` + `.png` | Game engines: Godot, Phaser, Unity, LÖVE, MonoGame, libGDX |
| Atlas | `.png` + `.json` | Custom engines: sheet plus glyph positions and advances |
| Glyph | `.png` | The selected glyph |
| Project | `.json` | Editable save; v2 stores rows as `#`/`.` text and the font metrics, v1 files still open |

BMFont, atlas and glyph exports share scale, padding, columns, ink and background options. The last choice is remembered.

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

This runs the app in development mode and regenerates the frontend bindings from the exported Go methods in [backend/](backend).

To run only the frontend in a browser:

```bash
npm install
npm run dev
```

Checks (also run in CI):

```bash
npm run lint && npm run typecheck && npm test
go test . ./backend
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

A GitHub Actions workflow is included in [.github/workflows/build.yml](.github/workflows/build.yml) to lint, test and build the desktop app for Windows and macOS on push, pull requests, or manual dispatch. On a published release it attaches one file per platform (`pixelart-font-studio.exe`, a zipped macOS app), which is what the in-app updater looks for.

## Technical notes

- The Wails bindings in the frontend stub files are normal placeholders for development and will be regenerated automatically during the first build or run.
- Font rasterization and TTF export logic were implemented to preserve the behavior of the original editor as closely as possible.
- The app is designed to be extensible: rendering helpers, import/export logic, and the editor store are separated so future changes remain easier to maintain.

## Contributing

Contributions are welcome. A good workflow is:

1. Start the app in development mode.
2. Make focused changes and keep the UI behavior consistent.
3. Run the checks before submitting changes.

```bash
npm run lint && npm run typecheck && npm test && npm run build
```
