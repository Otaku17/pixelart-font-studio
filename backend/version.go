package backend

import (
	"encoding/json"
	"strings"
)

// version is set by NewApp from the frontend package.json embedded in main.
var version = "1.0.0"

func parseVersion(data []byte) string {
	var payload struct {
		Version string `json:"version"`
	}
	if err := json.Unmarshal(data, &payload); err != nil {
		return ""
	}
	return strings.TrimSpace(payload.Version)
}

func appVersion() string {
	return version
}
