import { ipcMain } from "electron";
import { partitionChatReply } from "../../structuredPatchFromReply.ts";
import {
  buildSystemContextOnboardingPrompt,
  buildSystemDesignChatSystemPrompt,
  buildSystemMdMaterializationPrompt,
} from "../chatPrompts.ts";
import { isLocalAgentSelection, runLocalAiChat } from "../localAiRuntime.ts";
import { listReferenceEntries } from "../systemDesignListReferenceEntries.ts";
import { resolveMentionContexts } from "../systemDesignMentionResolver.ts";
import type { LocalAiSelection } from "../../../src/renderer/types/electron-api.ts";
import { extractMentionTokensFromText } from "./systemDesignMentionTokens.ts";

function parseSelection(value: unknown): LocalAiSelection | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const { provider, modelId } = value as { provider?: unknown; modelId?: unknown };
  if (typeof provider !== "string" || !provider.trim()) return undefined;
  return {
    provider: provider.trim(),
    modelId: typeof modelId === "string" ? modelId : undefined,
  };
}

function assertNoScanFolderForModel(scanFolderPath: unknown, selection: LocalAiSelection | undefined): void {
  if (typeof scanFolderPath !== "string" || !scanFolderPath.trim()) return;
  void selection;
}

export function registerSystemDesignToolIpc(): void {
  ipcMain.removeHandler("systemDesign:contextChatSend");
  ipcMain.handle("systemDesign:contextChatSend", async (event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid systemDesign:contextChatSend payload");
    }
    const { sessionKey, prompt, aiSelection, streamId, scanFolderPath } = payload as {
      sessionKey: string;
      prompt: string;
      aiSelection?: LocalAiSelection;
      streamId?: string;
      scanFolderPath?: string;
    };
    if (typeof sessionKey !== "string" || !sessionKey.trim() || typeof prompt !== "string") {
      throw new Error("Invalid systemDesign:contextChatSend fields");
    }

    const selection = parseSelection(aiSelection);
    if (typeof scanFolderPath === "string" && scanFolderPath.trim()) {
      const agent = await isLocalAgentSelection(selection);
      if (!agent) {
        throw new Error("Folder scan requires a local agent provider (Cursor CLI, Claude CLI, etc.)");
      }
    }

    const stream =
      typeof streamId === "string" && streamId.trim()
        ? { sender: event.sender, streamId: streamId.trim() }
        : undefined;

    const systemPrompt = buildSystemContextOnboardingPrompt(
      typeof scanFolderPath === "string" ? scanFolderPath : undefined,
    );
    const reply = await runLocalAiChat({
      sessionKey: sessionKey.trim(),
      systemPrompt,
      prompt,
      selection,
      stream,
    });
    return { reply };
  });

  ipcMain.removeHandler("systemDesign:materializeSystemMd");
  ipcMain.handle("systemDesign:materializeSystemMd", async (event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid systemDesign:materializeSystemMd payload");
    }
    const { sessionKey, messages, aiSelection, streamId, scanFolderPath } = payload as {
      sessionKey: string;
      messages: { role: string; content: string }[];
      aiSelection?: LocalAiSelection;
      streamId?: string;
      scanFolderPath?: string;
    };
    if (typeof sessionKey !== "string" || !sessionKey.trim() || !Array.isArray(messages)) {
      throw new Error("Invalid systemDesign:materializeSystemMd fields");
    }

    const selection = parseSelection(aiSelection);
    if (typeof scanFolderPath === "string" && scanFolderPath.trim()) {
      const agent = await isLocalAgentSelection(selection);
      if (!agent) {
        throw new Error("Folder scan requires a local agent provider");
      }
    }

    const transcript = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    const stream =
      typeof streamId === "string" && streamId.trim()
        ? { sender: event.sender, streamId: streamId.trim() }
        : undefined;

    const materializeKey = `${sessionKey.trim()}:materialize`;
    const systemPrompt = buildSystemMdMaterializationPrompt();
    const scanNote = scanFolderPath?.trim()
      ? `\n\nThe agent also explored codebase at: ${scanFolderPath.trim()}`
      : "";
    const reply = await runLocalAiChat({
      sessionKey: materializeKey,
      systemPrompt,
      prompt: `Conversation:\n\n${transcript}${scanNote}\n\nWrite SYSTEM.md now.`,
      selection,
      stream,
    });
    return { systemMd: reply.trim() };
  });

  ipcMain.removeHandler("systemDesign:chatSend");
  ipcMain.handle("systemDesign:chatSend", async (event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid systemDesign:chatSend payload");
    }
    const {
      sessionKey,
      activeFile,
      files,
      systemMd,
      prompt,
      aiSelection,
      streamId,
      scanFolderPath,
      referencePaths,
    } = payload as {
      sessionKey: string;
      activeFile: string;
      files: Record<string, string>;
      systemMd: string;
      prompt: string;
      aiSelection?: LocalAiSelection;
      streamId?: string;
      scanFolderPath?: string;
      referencePaths?: string[];
    };
    if (
      typeof sessionKey !== "string" ||
      !sessionKey.trim() ||
      typeof activeFile !== "string" ||
      !files ||
      typeof files !== "object" ||
      typeof prompt !== "string" ||
      typeof systemMd !== "string"
    ) {
      throw new Error("Invalid systemDesign:chatSend fields");
    }

    const selection = parseSelection(aiSelection);
    assertNoScanFolderForModel(scanFolderPath, selection);
    if (typeof scanFolderPath === "string" && scanFolderPath.trim()) {
      const agent = await isLocalAgentSelection(selection);
      if (!agent) {
        throw new Error("Folder scan requires a local agent provider");
      }
    }

    const tokens = extractMentionTokensFromText(prompt);
    const mentionContexts = await resolveMentionContexts({
      tokens,
      files,
      referencePaths: Array.isArray(referencePaths) ? referencePaths : [],
    });

    const stream =
      typeof streamId === "string" && streamId.trim()
        ? { sender: event.sender, streamId: streamId.trim() }
        : undefined;

    const systemPrompt = buildSystemDesignChatSystemPrompt({
      activeFile,
      files,
      systemMd,
      scanFolderPath: typeof scanFolderPath === "string" ? scanFolderPath : undefined,
      mentionContexts,
    });
    const reply = await runLocalAiChat({ sessionKey, systemPrompt, prompt, selection, stream });
    const { reply: cleanReply, patch } = partitionChatReply(reply, activeFile);
    return { reply: cleanReply, patch };
  });

  ipcMain.removeHandler("systemDesign:listReferenceEntries");
  ipcMain.handle("systemDesign:listReferenceEntries", async (_event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid systemDesign:listReferenceEntries payload");
    }
    const { referencePaths, query } = payload as { referencePaths?: string[]; query?: string };
    const paths = Array.isArray(referencePaths) ? referencePaths : [];
    const q = typeof query === "string" ? query : "";
    const entries = await listReferenceEntries(paths, q);
    return { entries };
  });

  ipcMain.removeHandler("systemDesign:getChatFolderPath");
  ipcMain.handle("systemDesign:getChatFolderPath", async (_event, documentId: unknown) => {
    if (typeof documentId !== "string" || !documentId.trim()) {
      throw new Error("Invalid document id");
    }
    const { getChatFolderPath } = await import("../../architectureFileIo.ts");
    const path = await getChatFolderPath(documentId.trim());
    return { path };
  });
}
