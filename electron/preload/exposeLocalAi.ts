import { ipcRenderer } from "electron";
import type {
  AiChatStreamPayload,
  ElectronApi,
  LocalAiOptions,
  MarkdownChatRequest,
  MarkdownChatResponse,
  UmlChatRequest,
  UmlChatResponse,
  WorkspaceChatRequest,
  WorkspaceChatResponse,
} from "../../src/renderer/types/electron-api.ts";

export function exposeLocalAiApis(): Pick<
  ElectronApi,
  | "markdownChatSend"
  | "umlChatSend"
  | "workspaceChatSend"
  | "subscribeAiChatStream"
  | "aiListLocalOptions"
  | "aiChatCancel"
> {
  return {
    markdownChatSend: (req: MarkdownChatRequest): Promise<MarkdownChatResponse> =>
      ipcRenderer.invoke("markdownChat:send", req),
    umlChatSend: (req: UmlChatRequest): Promise<UmlChatResponse> => ipcRenderer.invoke("umlChat:send", req),
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
    aiChatCancel: (sessionKey: string): Promise<boolean> =>
      ipcRenderer.invoke("ai:cancelChat", { sessionKey }),
  };
}
