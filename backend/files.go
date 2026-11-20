package backend

import (
	"encoding/base64"
	"os"
	"os/exec"
	"path/filepath"
	stdruntime "runtime"
)

// ReadFileBase64 reads a (binary) file and returns it base64-encoded.
func (a *App) ReadFileBase64(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(data), nil
}

// ReadFileText reads a UTF-8 text file (e.g. a .json project).
func (a *App) ReadFileText(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// WriteFileBase64 decodes a base64 payload and writes it to disk (PNG, TTF).
func (a *App) WriteFileBase64(path string, b64 string) error {
	data, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

// WriteFileText writes a UTF-8 string to disk (project, .fnt, .json).
func (a *App) WriteFileText(path string, content string) error {
	return os.WriteFile(path, []byte(content), 0o644)
}

// RevealInFolder opens the system file manager on the given file.
func (a *App) RevealInFolder(path string) error {
	var cmd *exec.Cmd
	switch stdruntime.GOOS {
	case "windows":
		cmd = exec.Command("explorer", "/select,", path)
	case "darwin":
		cmd = exec.Command("open", "-R", path)
	default:
		cmd = exec.Command("xdg-open", filepath.Dir(path))
	}
	// Start only: explorer.exe exits with code 1 even when it succeeds.
	return cmd.Start()
}
