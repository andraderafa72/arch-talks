import { ipcMain } from "electron";
import { cancelLocalAiChat, getLocalAiOptions } from "../localAiRuntime.ts";

export function registerAiDiscoveryIpc(): void {
  ipcMain.removeHandler("ai:listLocalOptions");
  ipcMain.handle("ai:listLocalOptions", async () => {
    try {
      return await getLocalAiOptions();
    } catch {
      return { providers: [], models: [] };
    }
  });

  ipcMain.removeHandler("ai:cancelChat");
  ipcMain.handle("ai:cancelChat", async (_event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid ai:cancelChat payload");
    }
    const { sessionKey } = payload as { sessionKey?: unknown };
    if (typeof sessionKey !== "string" || !sessionKey.trim()) {
      throw new Error("Invalid ai:cancelChat sessionKey");
    }
    return cancelLocalAiChat(sessionKey.trim());
  });
}
