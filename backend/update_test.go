package backend

import "testing"

func TestCompareVersions(t *testing.T) {
	cases := []struct {
		l, r string
		want int
	}{
		{"v1.0.2", "1.0.1", 1},
		{"1.0.1", "v1.0.1", 0},
		{"1.2", "1.2.0", 0},
		{"1.9.0", "1.10.0", -1},
	}
	for _, c := range cases {
		if got := compareVersions(c.l, c.r); got != c.want {
			t.Errorf("compareVersions(%q, %q) = %d, want %d", c.l, c.r, got, c.want)
		}
	}
}

func TestSelectReleaseAsset(t *testing.T) {
	assets := []releaseAsset{
		{Name: "pixelart-font-studio", BrowserDownloadURL: "bare"},
		{Name: "pixelart-font-studio-darwin-universal.zip", BrowserDownloadURL: "mac"},
		{Name: "pixelart-font-studio.exe", BrowserDownloadURL: "win"},
	}
	if a := selectReleaseAsset(assets, "windows"); a == nil || a.BrowserDownloadURL != "win" {
		t.Fatalf("windows asset not found: %+v", a)
	}
	if a := selectReleaseAsset(assets, "darwin"); a == nil || a.BrowserDownloadURL != "mac" {
		t.Fatalf("mac asset not found: %+v", a)
	}
}

func TestNewAppReadsVersion(t *testing.T) {
	NewApp([]byte(`{"name":"x","version":" 2.3.4 "}`))
	if v := appVersion(); v != "2.3.4" {
		t.Fatalf("version not read: %q", v)
	}
	version = "1.0.0"
}

func TestNewUpdateInfo(t *testing.T) {
	info := newUpdateInfo(cachedRelease{Version: "v999.0.0", URL: "x"})
	if !info.Available {
		t.Fatal("expected update available")
	}
	if newUpdateInfo(cachedRelease{Version: "v0.0.1", URL: "x"}).Available {
		t.Fatal("older release must not be offered")
	}
}
