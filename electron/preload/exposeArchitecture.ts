import { ipcRenderer } from "electron";
import type { ElectronApi } from "../../src/renderer/types/electron-api.ts";

export function exposeArchitectureApis(): Pick<
  ElectronApi,
  | "readArchitectureConversations"
  | "readArchitectureTemplates"
  | "writeArchitectureConversations"
  | "writeArchitectureTemplates"
  | "getArchitectureDataDir"
  | "readDocumentIndex"
  | "writeDocumentIndex"
  | "readDocumentFiles"
  | "writeDocumentFiles"
  | "chatLoad"
  | "chatSave"
  | "chatListFilesTree"
  | "chatMkdir"
  | "chatRename"
  | "chatRemove"
  | "chatOpenFolder"
> {
  return {
    readArchitectureConversations: (): Promise<{ items: unknown[] }> =>
      ipcRenderer.invoke("architecture:readConversations"),
    readArchitectureTemplates: (): Promise<{ items: unknown[] }> =>
      ipcRenderer.invoke("architecture:readTemplates"),
    writeArchitectureConversations: (doc: { items: unknown[] }): Promise<void> =>
      ipcRenderer.invoke("architecture:writeConversations", doc),
    writeArchitectureTemplates: (doc: { items: unknown[] }): Promise<void> =>
      ipcRenderer.invoke("architecture:writeTemplates", doc),
    getArchitectureDataDir: (): Promise<string> => ipcRenderer.invoke("architecture:getDataDir"),
    readDocumentIndex: (documentId: string) => ipcRenderer.invoke("document:readIndex", documentId),
    writeDocumentIndex: (documentId: string, index: unknown) =>
      ipcRenderer.invoke("document:writeIndex", { documentId, index }),
    readDocumentFiles: (documentId: string) => ipcRenderer.invoke("document:readFiles", documentId),
    writeDocumentFiles: (documentId: string, files: Record<string, string>) =>
      ipcRenderer.invoke("document:writeFiles", { documentId, files }),
    chatLoad: (documentId: string, chatId: string) => ipcRenderer.invoke("chat:load", { documentId, chatId }),
    chatSave: (documentId: string, chatId: string, detail: unknown) =>
      ipcRenderer.invoke("chat:save", { documentId, chatId, detail }),
    chatListFilesTree: (chatId: string) => ipcRenderer.invoke("chat:listFilesTree", chatId),
    chatMkdir: (chatId: string, relativePath: string) => ipcRenderer.invoke("chat:mkdir", { chatId, relativePath }),
    chatRename: (chatId: string, fromPath: string, toPath: string) =>
      ipcRenderer.invoke("chat:rename", { chatId, fromPath, toPath }),
    chatRemove: (chatId: string, relativePath: string) => ipcRenderer.invoke("chat:remove", { chatId, relativePath }),
    chatOpenFolder: (chatId: string) => ipcRenderer.invoke("chat:openFolder", chatId),
  };
}
