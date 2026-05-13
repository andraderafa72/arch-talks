import { ipcMain } from "electron";
import { partitionChatReply } from "../../markdownPatchFromReply.ts";
import { buildWorkspaceChatSystemPrompt } from "../chatPrompts.ts";
import { runLocalAiChat } from "../localAiRuntime.ts";
import type { LocalAiSelection } from "../../../src/renderer/types/electron-api.ts";

export function registerWorkspaceToolIpc(): void {
  ipcMain.handle("workspaceChat:send", async (event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid workspaceChat:send payload");
    }
    const { sessionKey, activeFile, files, prompt, aiSelection, streamId } = payload as {
      sessionKey: string;
      activeFile: string;
      files: Record<string, string>;
      prompt: string;
      aiSelection?: LocalAiSelection;
      streamId?: string;
    };
    if (
      typeof sessionKey !== "string" ||
      !sessionKey.trim() ||
      typeof activeFile !== "string" ||
      !files || typeof files !== "object" ||
      typeof prompt !== "string"
    ) {
      throw new Error("Invalid workspaceChat:send fields");
    }

    const stream =
      typeof streamId === "string" && streamId.trim()
        ? { sender: event.sender, streamId: streamId.trim() }
        : undefined;

    const systemPrompt = buildWorkspaceChatSystemPrompt(activeFile, files);
    const reply = await runLocalAiChat({ sessionKey, systemPrompt, prompt, selection: aiSelection, stream });
    const { reply: cleanReply, patch } = partitionChatReply(reply, activeFile);
    return { reply: cleanReply, patch };
  });
}
