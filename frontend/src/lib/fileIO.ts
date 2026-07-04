// Unified file IO: uses the native Wails dialogs/filesystem when the app is
// running inside the Wails desktop shell (window.go is injected), and falls
// back to standard browser download/upload when running in a plain browser
// (handy for `npm run dev` / `vite preview`).

function isWails(): boolean {
  return typeof window !== 'undefined' && !!window.go;
}

function browserDownload(filename: string, dataUrlOrText: Blob | string) {
  const blob =
    typeof dataUrlOrText === 'string'
      ? new Blob([dataUrlOrText])
      : dataUrlOrText;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function browserPickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// ---------------------------------------------------------------------
// Open a font file (.ttf/.otf/.woff) -> ArrayBuffer
// ---------------------------------------------------------------------
export async function pickFontFile(): Promise<{
  name: string;
  buffer: ArrayBuffer;
} | null> {
  if (isWails()) {
    const path = await window.go!.main.App.OpenFontFile();
    if (!path) return null;
    const b64 = await window.go!.main.App.ReadFileBase64(path);
    const name = path.split(/[\\/]/).pop() || 'font';
    return { name, buffer: base64ToArrayBuffer(b64) };
  }
  const file = await browserPickFile('.ttf,.otf,.woff');
  if (!file) return null;
  const buffer = await file.arrayBuffer();
  return { name: file.name, buffer };
}

// ---------------------------------------------------------------------
// Open a project (.json) -> text content
// ---------------------------------------------------------------------
export async function pickProjectFile(): Promise<string | null> {
  if (isWails()) {
    const path = await window.go!.main.App.OpenProjectFile();
    if (!path) return null;
    return window.go!.main.App.ReadFileText(path);
  }
  const file = await browserPickFile('.json');
  if (!file) return null;
  return file.text();
}

// ---------------------------------------------------------------------
// Save helpers
// ---------------------------------------------------------------------
export async function saveTextFile(
  defaultFilename: string,
  content: string,
  filterName = 'JSON',
  pattern = '*.json',
) {
  if (isWails()) {
    const path = await window.go!.main.App.SaveDialog(
      'Enregistrer',
      defaultFilename,
      filterName,
      pattern,
    );
    if (!path) return false;
    await window.go!.main.App.WriteFileText(path, content);
    return true;
  }
  browserDownload(defaultFilename, content);
  return true;
}

export async function saveBase64File(
  defaultFilename: string,
  base64: string,
  mime: string,
  filterName: string,
  pattern: string,
) {
  if (isWails()) {
    const path = await window.go!.main.App.SaveDialog(
      'Enregistrer',
      defaultFilename,
      filterName,
      pattern,
    );
    if (!path) return false;
    await window.go!.main.App.WriteFileBase64(path, base64);
    return true;
  }
  const buffer = base64ToArrayBuffer(base64);
  browserDownload(defaultFilename, new Blob([buffer], { type: mime }));
  return true;
}
