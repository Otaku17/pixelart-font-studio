package backend

import (
	"context"

	wruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App holds the Wails runtime context and exposes the methods bound to the frontend.
type App struct {
	ctx context.Context
}

// NewApp creates the App. packageJSON is the frontend package.json, embedded
// by main, which is the single source of truth for the app version.
func NewApp(packageJSON []byte) *App {
	if v := parseVersion(packageJSON); v != "" {
		version = v
	}
	return &App{}
}

// OnStartup returns the Wails startup hook. It is a function, not a method,
// so Wails does not expose it to the frontend.
func OnStartup(a *App) func(ctx context.Context) {
	return func(ctx context.Context) { a.ctx = ctx }
}

// GetAppVersion returns the version embedded at build time.
func (a *App) GetAppVersion() string {
	return appVersion()
}

// OpenDialog shows a native "open file" dialog filtered by one pattern
// (e.g. "*.ttf;*.otf;*.woff") and returns the path, or "" when cancelled.
func (a *App) OpenDialog(title, filterName, pattern string) (string, error) {
	return wruntime.OpenFileDialog(a.ctx, wruntime.OpenDialogOptions{
		Title:   title,
		Filters: []wruntime.FileFilter{{DisplayName: filterName, Pattern: pattern}},
	})
}

// SaveDialog shows a native "save file" dialog with a default file name and
// a single extension filter (e.g. "*.png"). Returns "" when cancelled.
func (a *App) SaveDialog(title, defaultFilename, filterName, pattern string) (string, error) {
	return wruntime.SaveFileDialog(a.ctx, wruntime.SaveDialogOptions{
		Title:           title,
		DefaultFilename: defaultFilename,
		Filters:         []wruntime.FileFilter{{DisplayName: filterName, Pattern: pattern}},
	})
}
