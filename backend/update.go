package backend

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	stdruntime "runtime"
	"time"
)

const (
	updateRepo        = "Otaku17/pixelart-font-studio"
	updateCheckWindow = 24 * time.Hour
)

// UpdateInfo is what the frontend receives from CheckForUpdates.
type UpdateInfo struct {
	Current   string `json:"current"`
	Version   string `json:"version"`
	URL       string `json:"url"`
	Available bool   `json:"available"`
}

func newUpdateInfo(latest cachedRelease) UpdateInfo {
	current := appVersion()
	info := UpdateInfo{Current: current, Version: latest.Version, URL: latest.URL}
	info.Available = latest.Version != "" && latest.URL != "" && compareVersions(latest.Version, current) > 0
	return info
}

func fetchLatestRelease() (cachedRelease, error) {
	client := &http.Client{Timeout: 8 * time.Second}
	url := fmt.Sprintf("https://api.github.com/repos/%s/releases/latest", updateRepo)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return cachedRelease{}, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	resp, err := client.Do(req)
	if err != nil {
		return cachedRelease{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return cachedRelease{}, fmt.Errorf("github: HTTP %d", resp.StatusCode)
	}
	var release githubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return cachedRelease{}, err
	}
	latest := cachedRelease{Version: release.TagName}
	if asset := selectReleaseAsset(release.Assets, stdruntime.GOOS); asset != nil {
		latest.URL = asset.BrowserDownloadURL
	}
	return latest, nil
}

// CheckForUpdates looks for a newer GitHub release. Without force, a result
// younger than 24 h is reused so the GitHub API is not hit on every launch;
// force (the "check for updates" button) always asks GitHub.
func (a *App) CheckForUpdates(force bool) (UpdateInfo, error) {
	if !force {
		if state, ok := loadUpdateState(); ok && time.Since(state.LastCheck) < updateCheckWindow {
			return newUpdateInfo(state.Latest), nil
		}
	}
	latest, err := fetchLatestRelease()
	if err != nil {
		return UpdateInfo{Current: appVersion()}, err
	}
	saveUpdateState(updateState{LastCheck: time.Now().UTC(), Latest: latest})
	return newUpdateInfo(latest), nil
}

// DownloadAndInstallUpdate downloads the release asset into the user cache
// folder and returns the downloaded file path.
func (a *App) DownloadAndInstallUpdate(url string) (string, error) {
	if url == "" {
		return "", fmt.Errorf("no update URL")
	}
	client := &http.Client{Timeout: 10 * time.Minute}
	resp, err := client.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("download failed: %d", resp.StatusCode)
	}
	dir, err := cacheDir("updates")
	if err != nil {
		return "", err
	}
	target := filepath.Join(dir, filepath.Base(url))
	partial := target + ".part"
	out, err := os.Create(partial)
	if err != nil {
		return "", err
	}
	_, copyErr := io.Copy(out, resp.Body)
	closeErr := out.Close()
	if copyErr != nil || closeErr != nil {
		_ = os.Remove(partial)
		return "", fmt.Errorf("download interrupted: %v %v", copyErr, closeErr)
	}
	if err := os.Rename(partial, target); err != nil {
		return "", err
	}
	return target, nil
}
