import { ipcRenderer } from "electron";
import type {
  ElectronApi,
  VaultApplyPlanRequest,
  VaultApplyPlanResponse,
  VaultChatRequest,
  VaultChatResponse,
  VaultConsumptionChatRequest,
  VaultConsumptionChatResponse,
  VaultAssignCategoryRequest,
  VaultAssignCategoryResponse,
  VaultInitializeRequest,
  VaultInitializeResponse,
  VaultReferenceScanResult,
} from "../../src/renderer/types/electron-api.ts";

export function exposeVaultApis(): Pick<
  ElectronApi,
  | "vaultChatSend"
  | "vaultConsumptionChatSend"
  | "vaultApplyPlan"
  | "vaultPickReferenceFolder"
  | "vaultPickDirectory"
  | "vaultInitialize"
  | "vaultAssignCategory"
  | "vaultListPaths"
  | "vaultReadFile"
  | "vaultScanReferenceFolder"
> {
  return {
    vaultChatSend: (req: VaultChatRequest): Promise<VaultChatResponse> =>
      ipcRenderer.invoke("vaultChat:send", req),
    vaultConsumptionChatSend: (req: VaultConsumptionChatRequest): Promise<VaultConsumptionChatResponse> =>
      ipcRenderer.invoke("vaultConsumptionChat:send", req),
    vaultApplyPlan: (req: VaultApplyPlanRequest): Promise<VaultApplyPlanResponse> =>
      ipcRenderer.invoke("vaultApplyPlan", req),
    vaultPickReferenceFolder: () => ipcRenderer.invoke("vault:pickDirectory"),
    vaultPickDirectory: () => ipcRenderer.invoke("vault:pickDirectory"),
    vaultInitialize: (req: VaultInitializeRequest): Promise<VaultInitializeResponse> =>
      ipcRenderer.invoke("vault:initialize", req),
    vaultAssignCategory: (req: VaultAssignCategoryRequest): Promise<VaultAssignCategoryResponse> =>
      ipcRenderer.invoke("vault:assignCategory", req),
    vaultListPaths: (
      documentId: string,
    ): Promise<{ diskPaths: string[]; files: Record<string, string>; vaultCategory?: import("../../src/renderer/types/electron-api").VaultCategory }> =>
      ipcRenderer.invoke("vault:listPaths", { documentId }),
    vaultReadFile: (documentId: string, relativePath: string): Promise<{ content: string }> =>
      ipcRenderer.invoke("vault:readFile", { documentId, relativePath }),
    vaultScanReferenceFolder: (folderPath: string): Promise<VaultReferenceScanResult> =>
      ipcRenderer.invoke("vault:scanReferenceFolder", folderPath),
  };
}
