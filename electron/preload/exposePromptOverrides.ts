import { ipcRenderer } from "electron";
import type { ElectronApi } from "../../src/renderer/types/electron-api.ts";

export function exposePromptOverrideApis(): Pick<
  ElectronApi,
  | "promptOverridesListCatalog"
  | "promptOverridesReadManifest"
  | "promptOverridesPreview"
  | "promptOverridesSave"
  | "promptOverridesDelete"
  | "promptOverridesSetEnabled"
> {
  return {
    promptOverridesListCatalog: (kind) => ipcRenderer.invoke("promptOverrides:listCatalog", kind),
    promptOverridesReadManifest: (scopeOrDocumentId, documentId) =>
      ipcRenderer.invoke("promptOverrides:readManifest", scopeOrDocumentId, documentId),
    promptOverridesPreview: (req) => ipcRenderer.invoke("promptOverrides:preview", req),
    promptOverridesSave: (req) => ipcRenderer.invoke("promptOverrides:save", req),
    promptOverridesDelete: (req) => ipcRenderer.invoke("promptOverrides:delete", req),
    promptOverridesSetEnabled: (req) => ipcRenderer.invoke("promptOverrides:setEnabled", req),
  };
}
