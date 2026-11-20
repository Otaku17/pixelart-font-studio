package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"

	"pixelart-font-studio/backend"
)

// Wails builds the root package and go:embed cannot reach parent folders,
// so this file stays here; everything else lives in backend/.

//go:embed all:frontend/dist
var assets embed.FS

//go:embed frontend/package.json
var packageJSON []byte

func main() {
	app := backend.NewApp(packageJSON)

	err := wails.Run(&options.App{
		Title:     "PixelArt Font Studio",
		Width:     1280,
		Height:    720,
		MinWidth:  1024,
		MinHeight: 640,
		// The title bar is drawn by the frontend (Soft Dark UI TitleBar);
		// empty areas with --wails-draggable: drag move the window.
		Frameless: true,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 10, G: 10, B: 10, A: 1},
		OnStartup:        backend.OnStartup(app),
		Windows: &windows.Options{
			// Keeps the native shadow and rounded corners on a frameless window.
			DisableFramelessWindowDecorations: false,
		},
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
