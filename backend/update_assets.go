package backend

import (
	"strconv"
	"strings"
)

type releaseAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

type githubRelease struct {
	TagName string         `json:"tag_name"`
	Assets  []releaseAsset `json:"assets"`
}

// compareVersions returns 1 when left > right, -1 when left < right, 0 otherwise.
// A leading "v" and missing parts are ignored ("v1.2" == "1.2.0").
func compareVersions(left, right string) int {
	leftParts := strings.Split(strings.TrimPrefix(strings.TrimSpace(left), "v"), ".")
	rightParts := strings.Split(strings.TrimPrefix(strings.TrimSpace(right), "v"), ".")
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
		if l != r {
			if l > r {
				return 1
			}
			return -1
		}
	}
	return 0
}

func hasAnySuffix(name string, suffixes ...string) bool {
	for _, s := range suffixes {
		if strings.HasSuffix(name, s) {
			return true
		}
	}
	return false
}

func containsAny(name string, parts ...string) bool {
	for _, p := range parts {
		if strings.Contains(name, p) {
			return true
		}
	}
	return false
}

func matchesPlatform(name, goos string) bool {
	isArchive := containsAny(name, ".zip", ".tar.gz", ".tgz")
	isBinary := hasAnySuffix(name, ".exe", ".app", ".dmg", ".pkg", ".msi")
	if !isArchive && !isBinary {
		return false
	}
	switch goos {
	case "windows":
		// Not a bare "win": "darwin" contains it.
		return containsAny(name, "windows", "win32", "win64") || hasAnySuffix(name, ".exe", ".msi")
	case "darwin":
		return containsAny(name, "darwin", "mac", "osx", "universal") || hasAnySuffix(name, ".app", ".dmg", ".pkg")
	case "linux":
		return containsAny(name, "linux", "amd64", "x64", "tar")
	}
	return false
}

// selectReleaseAsset picks the release file matching the running platform.
// Platform-specific files win; a bare "pixelart-font-studio" binary is only
// a fallback outside Windows (it used to be picked first on every OS).
func selectReleaseAsset(assets []releaseAsset, goos string) *releaseAsset {
	for i := range assets {
		if matchesPlatform(strings.ToLower(assets[i].Name), goos) {
			return &assets[i]
		}
	}
	if goos == "windows" {
		return nil
	}
	for i := range assets {
		if strings.ToLower(assets[i].Name) == "pixelart-font-studio" {
			return &assets[i]
		}
	}
	return nil
}
