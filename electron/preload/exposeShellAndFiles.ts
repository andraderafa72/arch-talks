import { ipcRenderer } from "electron";
import type { ElectronApi } from "../../src/renderer/types/electron-api.ts";

export function exposeShellAndFilesApis(): Pick<
  ElectronApi,
  "openPathInUserData" | "savePdfWithDialog" | "saveTextWithDialog" | "openTextWithDialog" | "printCurrentWebContentsToPdf"
> {
  return {
    openPathInUserData: (p: string): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke("shell:openPath", p),
    savePdfWithDialog: (
      data: ArrayBuffer,
      defaultFilename: string,
    ): Promise<
      { ok: true; path: string } | { ok: false; canceled?: boolean; error?: string }
    > => ipcRenderer.invoke("pdf:saveWithDialog", { defaultFilename, data }),
    saveTextWithDialog: (
      content: string,
      defaultFilename: string,
      existingPath?: string,
    ): Promise<
      { ok: true; path: string } | { ok: false; canceled?: boolean; error?: string }
    > => ipcRenderer.invoke("file:saveTextWithDialog", { content, defaultFilename, existingPath }),
    openTextWithDialog: (): Promise<
      { ok: true; path: string; content: string } | { ok: false; canceled?: boolean; error?: string }
    > => ipcRenderer.invoke("file:openTextWithDialog"),
    printCurrentWebContentsToPdf: (): Promise<
      { ok: true; data: ArrayBuffer } | { ok: false; error: string }
    > => ipcRenderer.invoke("pdf:printCurrentWebContents"),
  };
}
