import { contextBridge, ipcRenderer } from "electron";
import type { LatexRenderRequest, LatexRenderResult } from "./latex/types.ts";
import type {
  AiChatStreamPayload,
  LocalAiOptions,
  MarkdownChatRequest,
  MarkdownChatResponse,
  WorkspaceChatRequest,
  WorkspaceChatResponse,
} from "../src/renderer/types/electron-api.ts";

contextBridge.exposeInMainWorld("electronApi", {
  platform: process.platform,
  renderLatex: (req: LatexRenderRequest): Promise<LatexRenderResult> => ipcRenderer.invoke("latex:render", req),
  openPathInUserData: (p: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke("shell:openPath", p),
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
  markdownChatSend: (req: MarkdownChatRequest): Promise<MarkdownChatResponse> =>
    ipcRenderer.invoke("markdownChat:send", req),
  workspaceChatSend: (req: WorkspaceChatRequest): Promise<WorkspaceChatResponse> =>
    ipcRenderer.invoke("workspaceChat:send", req),
  subscribeAiChatStream: (listener: (payload: AiChatStreamPayload) => void): (() => void) => {
    const handler = (_event: unknown, payload: AiChatStreamPayload) => listener(payload);
    ipcRenderer.on("aiChat:stream", handler);
    return () => {
      ipcRenderer.removeListener("aiChat:stream", handler);
    };
  },
  aiListLocalOptions: (): Promise<LocalAiOptions> => ipcRenderer.invoke("ai:listLocalOptions"),
});
