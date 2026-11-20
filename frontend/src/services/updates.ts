import * as Go from '../../wailsjs/go/backend/App';
import { isDesktop } from './fileIO';

export interface UpdateInfo {
  current: string;
  version: string;
  url: string;
  available: boolean;
}

/** Thin wrappers over the Go update API (no-ops in a plain browser). */

export async function checkForUpdates(force: boolean): Promise<UpdateInfo> {
  if (!isDesktop()) return { current: '', version: '', url: '', available: false };
  return Go.CheckForUpdates(force);
}

export function downloadUpdate(url: string): Promise<string> {
  return Go.DownloadAndInstallUpdate(url);
}

export function revealInFolder(path: string): Promise<void> {
  return Go.RevealInFolder(path);
}

export async function getAppVersion(): Promise<string> {
  return isDesktop() ? Go.GetAppVersion() : 'dev';
}
