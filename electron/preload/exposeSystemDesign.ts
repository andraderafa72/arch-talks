import { ipcRenderer } from "electron";
import type {
  ElectronApi,
  LocalAiSelection,
  SystemDesignChatRequest,
  SystemDesignChatResponse,
  SystemDesignContextChatRequest,
  SystemDesignContextChatResponse,
  SystemDesignListReferenceEntriesRequest,
  SystemDesignListReferenceEntriesResponse,
  SystemDesignMaterializeRequest,
  SystemDesignMaterializeResponse,
} from "../../src/renderer/types/electron-api.ts";

export function exposeSystemDesignApis(): Pick<
  ElectronApi,
  | "systemDesignContextChatSend"
  | "systemDesignMaterializeSystemMd"
  | "systemDesignChatSend"
  | "systemDesignListReferenceEntries"
  | "systemDesignGetChatFolderPath"
  | "pickDirectory"
> {
  return {
    systemDesignContextChatSend: (
      req: SystemDesignContextChatRequest,
    ): Promise<SystemDesignContextChatResponse> => ipcRenderer.invoke("systemDesign:contextChatSend", req),
    systemDesignMaterializeSystemMd: (
      req: SystemDesignMaterializeRequest,
    ): Promise<SystemDesignMaterializeResponse> => ipcRenderer.invoke("systemDesign:materializeSystemMd", req),
    systemDesignChatSend: (req: SystemDesignChatRequest): Promise<SystemDesignChatResponse> =>
      ipcRenderer.invoke("systemDesign:chatSend", req),
    systemDesignListReferenceEntries: (
      req: SystemDesignListReferenceEntriesRequest,
    ): Promise<SystemDesignListReferenceEntriesResponse> =>
      ipcRenderer.invoke("systemDesign:listReferenceEntries", req),
    systemDesignGetChatFolderPath: (documentId: string): Promise<{ path: string }> =>
      ipcRenderer.invoke("systemDesign:getChatFolderPath", documentId),
    pickDirectory: (): Promise<{ ok: true; path: string } | { ok: false; canceled: true }> =>
      ipcRenderer.invoke("vault:pickDirectory"),
  };
}
