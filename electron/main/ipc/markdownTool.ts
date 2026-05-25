import { ipcMain } from "electron";
import { partitionChatReply } from "../../structuredPatchFromReply.ts";
import { buildMarkdownChatSystemPrompt } from "../chatPrompts.ts";
import { runLocalAiChat } from "../localAiRuntime.ts";
import type { LocalAiSelection } from "../../../src/renderer/types/electron-api.ts";

export function registerMarkdownToolIpc(): void {
  ipcMain.handle("markdownChat:send", async (event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid markdownChat:send payload");
    }
    const { sessionKey, activeFile, fileContent, prompt, aiSelection, streamId } = payload as {
      sessionKey: string;
      activeFile: string;
      fileContent: string;
      prompt: string;
      aiSelection?: LocalAiSelection;
      streamId?: string;
    };
    if (
      typeof sessionKey !== "string" ||
      !sessionKey.trim() ||
      typeof activeFile !== "string" ||
      typeof fileContent !== "string" ||
      typeof prompt !== "string"
    ) {
      throw new Error("Invalid markdownChat:send fields");
    }

    const stream =
      typeof streamId === "string" && streamId.trim()
        ? { sender: event.sender, streamId: streamId.trim() }
        : undefined;

    const systemPrompt = buildMarkdownChatSystemPrompt(activeFile, fileContent);
    const reply = await runLocalAiChat({ sessionKey, systemPrompt, prompt, selection: aiSelection, stream });
    const { reply: cleanReply, patch } = partitionChatReply(reply, activeFile);
    return { reply: cleanReply, patch };
  });
}
