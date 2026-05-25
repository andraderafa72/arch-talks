import { ipcRenderer } from "electron";
import type { ElectronApi } from "../../src/renderer/types/electron-api.ts";

export function exposeWindowControlsApis(): Pick<
  ElectronApi,
  | "windowMinimize"
  | "windowToggleMaximize"
  | "windowClose"
  | "windowIsMaximized"
  | "subscribeWindowMaximized"
> {
  return {
    windowMinimize: () => ipcRenderer.invoke("window:minimize"),
    windowToggleMaximize: () => ipcRenderer.invoke("window:toggleMaximize") as Promise<boolean>,
    windowClose: () => ipcRenderer.invoke("window:close"),
    windowIsMaximized: () => ipcRenderer.invoke("window:isMaximized") as Promise<boolean>,
    subscribeWindowMaximized: (listener) => {
      const handler = (_event: unknown, maximized: boolean) => {
        listener(maximized);
      };
      ipcRenderer.on("window:maximized-changed", handler);
      return () => ipcRenderer.removeListener("window:maximized-changed", handler);
    },
  };
}
