import type { ElectronApi } from "@/types/electron-api";

function readApiFromWindow(win: Window): ElectronApi | undefined {
  return win.electronApi;
}

/** Resolves the Electron preload bridge from the current window (or parent/top). */
export function getElectronApi(): ElectronApi | undefined {
  if (typeof window === "undefined") return undefined;

  const direct = readApiFromWindow(window);
  if (direct) return direct;

  try {
    if (window.top && window.top !== window) {
      const top = readApiFromWindow(window.top);
      if (top) return top;
    }
  } catch {
    /* cross-origin */
  }

  try {
    if (window.parent && window.parent !== window) {
      const parent = readApiFromWindow(window.parent);
      if (parent) return parent;
    }
  } catch {
    /* cross-origin */
  }

  return undefined;
}

export function isElectronApp(): boolean {
  return Boolean(getElectronApi()?.platform);
}

export function requireElectronApi(): ElectronApi {
  const api = getElectronApi();
  if (!api?.platform) {
    throw new Error(
      "Electron bridge is not loaded. Use the RAG Talks application window (npm run dev), not a separate browser tab on localhost.",
    );
  }
  return api;
}

export function requireVaultElectronApi(): ElectronApi {
  const api = requireElectronApi();
  if (!api.vaultInitialize || !api.vaultAssignCategory || !api.vaultPickDirectory) {
    throw new Error(
      "Vault IPC is missing from the preload bridge. Stop the app, run npm run build:electron, then start again with npm run dev.",
    );
  }
  return api;
}
