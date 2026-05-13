import { ipcMain } from "electron";
import { getLocalAiOptions } from "../localAiRuntime.ts";

export function registerAiDiscoveryIpc(): void {
  ipcMain.handle("ai:listLocalOptions", async () => {
    try {
      return await getLocalAiOptions();
    } catch {
      return { providers: [], models: [] };
    }
  });
}
