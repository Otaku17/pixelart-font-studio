package backend

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

type cachedRelease struct {
	Version string `json:"version"`
	URL     string `json:"url"`
}

// updateState is persisted in <user cache>/pixelart-font-studio/update-state.json.
type updateState struct {
	LastCheck time.Time     `json:"lastCheck"`
	Latest    cachedRelease `json:"latest"`
}

func cacheDir(sub ...string) (string, error) {
	base, err := os.UserCacheDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(append([]string{base, "pixelart-font-studio"}, sub...)...)
	return dir, os.MkdirAll(dir, 0o755)
}

func updateStatePath() (string, error) {
	dir, err := cacheDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "update-state.json"), nil
}

// loadUpdateState returns ok=false when there is no usable cached result
// (no file, or an old file that only stored the check date).
func loadUpdateState() (updateState, bool) {
	var state updateState
	path, err := updateStatePath()
	if err != nil {
		return state, false
	}
	data, err := os.ReadFile(path)
	if err != nil || json.Unmarshal(data, &state) != nil || state.Latest.Version == "" {
		return state, false
	}
	return state, true
}

func saveUpdateState(state updateState) {
	path, err := updateStatePath()
	if err != nil {
		return
	}
	if data, err := json.Marshal(state); err == nil {
		_ = os.WriteFile(path, data, 0o644)
	}
}
