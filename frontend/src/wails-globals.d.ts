export {};

declare global {
  interface Window {
    go?: {
      main: {
        App: {
          OpenFontFile(): Promise<string>;
          OpenProjectFile(): Promise<string>;
          SaveDialog(
            title: string,
            defaultFilename: string,
            filterName: string,
            pattern: string
          ): Promise<string>;
          ReadFileBase64(path: string): Promise<string>;
          ReadFileText(path: string): Promise<string>;
          WriteFileBase64(path: string, b64: string): Promise<void>;
          WriteFileText(path: string, content: string): Promise<void>;
        };
      };
    };
    runtime?: {
      EventsOn(eventName: string, callback: (...data: any[]) => void): () => void;
      EventsEmit(eventName: string, ...data: any[]): void;
      WindowSetTitle?(title: string): void;
    };
  }
}
