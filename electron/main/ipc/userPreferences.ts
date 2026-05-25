import { ipcMain } from "electron";
import { readUserPreferencesFile, writeUserPreferencesFile } from "../../userPreferencesIo.ts";

export function registerUserPreferencesIpc(): void {
  ipcMain.handle("userPreferences:read", async () => readUserPreferencesFile());

  ipcMain.handle("userPreferences:write", async (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return { ok: false as const, error: "Invalid preferences payload" };
    }
    await writeUserPreferencesFile(payload);
    return { ok: true as const };
  });
}
