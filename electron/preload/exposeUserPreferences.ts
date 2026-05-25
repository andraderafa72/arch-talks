import { ipcRenderer } from "electron";
import type { ElectronApi } from "../../src/renderer/types/electron-api.ts";

export function exposeUserPreferencesApis(): Pick<ElectronApi, "readUserPreferences" | "writeUserPreferences"> {
  return {
    readUserPreferences: (): Promise<unknown | null> => ipcRenderer.invoke("userPreferences:read"),
    writeUserPreferences: (preferences: unknown): Promise<{ ok: true } | { ok: false; error: string }> =>
      ipcRenderer.invoke("userPreferences:write", preferences),
  };
}
