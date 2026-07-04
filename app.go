package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	stdruntime "runtime"
	"strconv"
	"strings"
	"time"

	wruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct holds the Wails runtime context and exposes methods
// that are callable from the React/TypeScript frontend.
type App struct {
	ctx context.Context
}

type releaseAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

type githubRelease struct {
	TagName string         `json:"tag_name"`
	Assets  []releaseAsset `json:"assets"`
}

const (
	appVersion        = "1.0.0"
	updateRepo        = "Otaku17/pixelart-font-studio"
	updateCheckWindow = 24 * time.Hour
)

func compareVersions(left, right string) int {
	left = strings.TrimPrefix(strings.TrimSpace(left), "v")
	right = strings.TrimPrefix(strings.TrimSpace(right), "v")
	leftParts := strings.Split(left, ".")
	rightParts := strings.Split(right, ".")
	maxLen := len(leftParts)
	if len(rightParts) > maxLen {
		maxLen = len(rightParts)
	}
	for i := 0; i < maxLen; i++ {
		var l, r int
		if i < len(leftParts) {
			l, _ = strconv.Atoi(leftParts[i])
		}
		if i < len(rightParts) {
			r, _ = strconv.Atoi(rightParts[i])
		}
		if l > r {
			return 1
		}
		if l < r {
			return -1
		}
	}
	return 0
}

func selectReleaseAsset(assets []releaseAsset, goos, goarch string) *releaseAsset {
	for _, asset := range assets {
		name := strings.ToLower(asset.Name)
		switch goos {
		case "windows":
			if strings.Contains(name, "windows") && strings.Contains(name, goarch) && strings.Contains(name, ".zip") {
				return &asset
			}
		case "darwin":
			if strings.Contains(name, "darwin") && strings.Contains(name, "universal") && strings.Contains(name, ".zip") {
				return &asset
			}
		case "linux":
			if strings.Contains(name, "linux") && strings.Contains(name, goarch) && (strings.Contains(name, ".tar.gz") || strings.Contains(name, ".tgz")) {
				return &asset
			}
		}
	}
	return nil
}

func (a *App) checkForUpdates(force bool) (string, string, bool, error) {
	if a.ctx == nil {
		return "", "", false, nil
	}
	if value, err := os.UserCacheDir(); err == nil {
		cacheDir := filepath.Join(value, "pixelart-font-studio")
		_ = os.MkdirAll(cacheDir, 0o755)
		stateFile := filepath.Join(cacheDir, "update-state.json")
		if data, err := os.ReadFile(stateFile); err == nil {
			var state struct {
				LastCheck time.Time `json:"lastCheck"`
			}
			if err := json.Unmarshal(data, &state); err == nil && !force && time.Since(state.LastCheck) < updateCheckWindow {
				return "", "", false, nil
			}
		}
		if err := os.WriteFile(stateFile, []byte(`{"lastCheck":"`+time.Now().UTC().Format(time.RFC3339)+`"}`), 0o644); err != nil {
			return "", "", false, err
		}
	}

	client := &http.Client{Timeout: 8 * time.Second}
	url := fmt.Sprintf("https://api.github.com/repos/%s/releases/latest", updateRepo)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return "", "", false, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	resp, err := client.Do(req)
	if err != nil {
		return "", "", false, nil
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", "", false, nil
	}

	var release githubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return "", "", false, err
	}
	if compareVersions(release.TagName, appVersion) <= 0 {
		return "", "", false, nil
	}
	asset := selectReleaseAsset(release.Assets, stdruntime.GOOS, stdruntime.GOARCH)
	if asset == nil || asset.BrowserDownloadURL == "" {
		return release.TagName, "", false, nil
	}
	return release.TagName, asset.BrowserDownloadURL, true, nil
}

func (a *App) downloadAndInstallUpdate(url string) (string, error) {
	if url == "" {
		return "", fmt.Errorf("no update URL")
	}
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("download failed: %d", resp.StatusCode)
	}
	cacheDir, err := os.UserCacheDir()
	if err != nil {
		return "", err
	}
	cacheDir = filepath.Join(cacheDir, "pixelart-font-studio", "updates")
	if err := os.MkdirAll(cacheDir, 0o755); err != nil {
		return "", err
	}
	archivePath := filepath.Join(cacheDir, filepath.Base(url))
	out, err := os.Create(archivePath)
	if err != nil {
		return "", err
	}
	defer out.Close()
	if _, err := io.Copy(out, resp.Body); err != nil {
		return "", err
	}
	return archivePath, nil
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the Wails runtime methods (dialogs, etc.) later on.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// CheckForUpdates performs a rate-limited GitHub release check and returns
// the latest available version and a download URL when a matching asset exists.
// The force flag bypasses the cache so the update button can trigger a fresh lookup.
func (a *App) CheckForUpdates(force bool) (string, string, bool, error) {
	return a.checkForUpdates(force)
}

// DownloadAndInstallUpdate downloads the matching release asset to the local cache.
func (a *App) DownloadAndInstallUpdate(url string) (string, error) {
	return a.downloadAndInstallUpdate(url)
}

// ---------------------------------------------------------------------
// Open dialogs
// ---------------------------------------------------------------------

// OpenFontFile opens a native "open file" dialog filtered to font files
// and returns the selected path (empty string if the user cancelled).
func (a *App) OpenFontFile() (string, error) {
	return wruntime.OpenFileDialog(a.ctx, wruntime.OpenDialogOptions{
		Title: "Ouvrir une police",
		Filters: []wruntime.FileFilter{
			{DisplayName: "Fonts (*.ttf;*.otf;*.woff)", Pattern: "*.ttf;*.otf;*.woff"},
		},
	})
}

// OpenProjectFile opens a native "open file" dialog filtered to .json
// project files and returns the selected path.
func (a *App) OpenProjectFile() (string, error) {
	return wruntime.OpenFileDialog(a.ctx, wruntime.OpenDialogOptions{
		Title: "Ouvrir un projet",
		Filters: []wruntime.FileFilter{
			{DisplayName: "Projet PixelArt Font Studio (*.json)", Pattern: "*.json"},
		},
	})
}

// SaveDialog opens a native "save file" dialog with the given default
// filename and a single extension filter (e.g. "*.png", "*.ttf", "*.json").
func (a *App) SaveDialog(title, defaultFilename, filterName, pattern string) (string, error) {
	return wruntime.SaveFileDialog(a.ctx, wruntime.SaveDialogOptions{
		Title:           title,
		DefaultFilename: defaultFilename,
		Filters: []wruntime.FileFilter{
			{DisplayName: filterName, Pattern: pattern},
		},
	})
}

// ---------------------------------------------------------------------
// File IO
// ---------------------------------------------------------------------

// ReadFileBase64 reads an arbitrary (binary) file from disk and returns
// its content base64-encoded, ready to be consumed by the frontend.
func (a *App) ReadFileBase64(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(data), nil
}

// ReadFileText reads a text file (e.g. a .json project) and returns it
// as a UTF-8 string.
func (a *App) ReadFileText(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// WriteFileBase64 decodes the given base64 payload and writes it to disk.
// Used for binary exports (PNG, TTF).
func (a *App) WriteFileBase64(path string, b64 string) error {
	data, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

// WriteFileText writes a UTF-8 string to disk. Used for the .json project export.
func (a *App) WriteFileText(path string, content string) error {
	return os.WriteFile(path, []byte(content), 0644)
}
