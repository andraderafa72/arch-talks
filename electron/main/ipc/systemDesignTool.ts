import { ipcMain } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { ensureArchitectureDataDir, writeDocumentIndex } from "../../architectureFileIo.ts";
import {
  buildArchSystemDesignConfig,
  readArchSystemDesignConfig,
  writeArchSystemDesignConfig,
} from "../../systemDesign/archConfig.ts";
import {
  buildSystemDesignScaffold,
  pickSystemDesignActiveFile,
} from "../../systemDesign/systemDesignScaffold.ts";
import { writeSystemDesignRootFiles } from "../../systemDesign/systemDesignRootIo.ts";
import { partitionChatReply } from "../../structuredPatchFromReply.ts";
import {
  buildSystemContextOnboardingPrompt,
  buildSystemContextOnboardingPromptSegments,
  buildSystemDesignChatPromptSegments,
  buildSystemDesignChatSystemPrompt,
  buildSystemDesignMaterializationPrompt,
  buildSystemDesignMaterializationPromptSegments,
} from "../chatPrompts.ts";
import {
  isLocalAgentSelection,
  runLocalAiChat,
} from "../localAiRuntime.ts";
import { buildSystemDesignAgentWorkspace, resolveAllowedAgentScanPath } from "../agentWorkspace.ts";
import { listReferenceEntries } from "../systemDesignListReferenceEntries.ts";
import { resolveMentionContexts } from "../systemDesignMentionResolver.ts";
import type { LocalAiSelection } from "../../../src/renderer/types/electron-api.ts";
import { parseAndValidateMaterializedSystemDesign } from "../systemDesignMaterialize.ts";
import { extractMentionTokensFromText } from "./systemDesignMentionTokens.ts";
import { resolveSystemPrompt } from "../resolveSystemPrompt.ts";

function parseSelection(value: unknown): LocalAiSelection | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const { provider, modelId } = value as { provider?: unknown; modelId?: unknown };
  if (typeof provider !== "string" || !provider.trim()) return undefined;
  return {
    provider: provider.trim(),
    modelId: typeof modelId === "string" ? modelId : undefined,
  };
}

async function resolveScanFolderForPrompt(
  scanFolderPath: unknown,
  selection: LocalAiSelection | undefined,
): Promise<string | undefined> {
  const scan = typeof scanFolderPath === "string" ? scanFolderPath.trim() : "";
  if (!scan) return undefined;
  const agent = await isLocalAgentSelection(selection);
  if (!agent) return undefined;
  return resolveAllowedAgentScanPath(scan);
}

function sanitizeFolderName(name: string): string {
  const trimmed = name.trim().replace(/[/\\]+/g, "-");
  return trimmed.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "system-design";
}

export function registerSystemDesignToolIpc(): void {
  ipcMain.removeHandler("systemDesign:initialize");
  ipcMain.handle("systemDesign:initialize", async (_event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid systemDesign:initialize payload");
    }
    const { documentId, name, mode, existingRootPath, parentPath, newFolderName } = payload as {
      documentId: string;
      name: string;
      mode: "existing" | "new";
      existingRootPath?: string;
      parentPath?: string;
      newFolderName?: string;
    };

    if (typeof documentId !== "string" || !documentId.trim()) {
      throw new Error("Invalid documentId");
    }
    if (typeof name !== "string" || !name.trim()) {
      throw new Error("Project name is required");
    }
    if (mode !== "existing" && mode !== "new") {
      throw new Error("Invalid location mode");
    }

    let rootPath: string;
    if (mode === "existing") {
      if (typeof existingRootPath !== "string" || !existingRootPath.trim()) {
        throw new Error("Select a folder for the system design project");
      }
      rootPath = path.resolve(existingRootPath.trim());
      const stat = await fs.stat(rootPath).catch(() => null);
      if (!stat?.isDirectory()) {
        throw new Error("Selected folder does not exist");
      }
    } else {
      if (typeof parentPath !== "string" || !parentPath.trim()) {
        throw new Error("Select a parent folder");
      }
      const folderName =
        typeof newFolderName === "string" && newFolderName.trim()
          ? sanitizeFolderName(newFolderName)
          : sanitizeFolderName(name);
      rootPath = path.resolve(parentPath.trim(), folderName);
      await fs.mkdir(rootPath, { recursive: true });
    }

    await ensureArchitectureDataDir();

    let archConfig = await readArchSystemDesignConfig(rootPath);
    if (!archConfig) {
      archConfig = buildArchSystemDesignConfig({
        name: name.trim(),
        documentId: documentId.trim(),
        rootPath,
      });
      await writeArchSystemDesignConfig(rootPath, archConfig);
    }

    const files = buildSystemDesignScaffold();
    await writeSystemDesignRootFiles(rootPath, files);
    const activeFile = pickSystemDesignActiveFile(files);
    const firstChatTabId = crypto.randomUUID();

    await writeDocumentIndex(documentId.trim(), {
      id: documentId.trim(),
      title: name.trim(),
      kind: "system_design",
      templateId: null,
      activeFile,
      fileCount: Object.keys(files).length,
      systemDesignRootPath: rootPath,
      chatTabs: [{ id: firstChatTabId, title: "Chat 1" }],
      openChatTabIds: [firstChatTabId],
      activeChatTabId: firstChatTabId,
      pendingPatch: null,
      savedSnapshot: { ...files },
      openEditorTabs: [activeFile],
    });

    return {
      rootPath,
      archConfig,
      files,
      activeFile,
    };
  });

  ipcMain.removeHandler("systemDesign:contextChatSend");
  ipcMain.handle("systemDesign:contextChatSend", async (event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid systemDesign:contextChatSend payload");
    }
    const { sessionKey, documentId, prompt, aiSelection, streamId, scanFolderPath } = payload as {
      sessionKey: string;
      documentId?: string;
      prompt: string;
      aiSelection?: LocalAiSelection;
      streamId?: string;
      scanFolderPath?: string;
    };
    if (typeof sessionKey !== "string" || !sessionKey.trim() || typeof prompt !== "string") {
      throw new Error("Invalid systemDesign:contextChatSend fields");
    }

    const selection = parseSelection(aiSelection);
    const effectiveScanFolderPath = await resolveScanFolderForPrompt(scanFolderPath, selection);

    const stream =
      typeof streamId === "string" && streamId.trim()
        ? { sender: event.sender, streamId: streamId.trim() }
        : undefined;

    const defaultPrompt = buildSystemContextOnboardingPrompt(effectiveScanFolderPath);
    const systemPrompt = await resolveSystemPrompt({
      documentId,
      promptId: "system_design.onboarding",
      defaultPrompt,
      segments: buildSystemContextOnboardingPromptSegments(effectiveScanFolderPath),
      placeholders: { scanFolderPath: effectiveScanFolderPath },
    });
    const reply = await runLocalAiChat({
      sessionKey: sessionKey.trim(),
      systemPrompt,
      prompt,
      selection,
      stream,
      workspace: buildSystemDesignAgentWorkspace(effectiveScanFolderPath),
    });
    return { reply };
  });

  ipcMain.removeHandler("systemDesign:materializeSystemMd");
  ipcMain.handle("systemDesign:materializeSystemMd", async (event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid systemDesign:materializeSystemMd payload");
    }
    const { sessionKey, documentId, messages, aiSelection, streamId, scanFolderPath, files } = payload as {
      sessionKey: string;
      documentId?: string;
      messages: { role: string; content: string }[];
      aiSelection?: LocalAiSelection;
      streamId?: string;
      scanFolderPath?: string;
      files?: Record<string, string>;
    };
    if (typeof sessionKey !== "string" || !sessionKey.trim() || !Array.isArray(messages)) {
      throw new Error("Invalid systemDesign:materializeSystemMd fields");
    }

    const selection = parseSelection(aiSelection);
    const effectiveScanFolderPath = await resolveScanFolderForPrompt(scanFolderPath, selection);

    const transcript = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    const stream =
      typeof streamId === "string" && streamId.trim()
        ? { sender: event.sender, streamId: streamId.trim() }
        : undefined;

    const materializeKey = `${sessionKey.trim()}:materialize`;
    const existingPumlPaths =
      files && typeof files === "object" && !Array.isArray(files)
        ? Object.keys(files).filter((file) => file.endsWith(".puml"))
        : [];
    const defaultPrompt = buildSystemDesignMaterializationPrompt({ existingPumlPaths });
    const systemPrompt = await resolveSystemPrompt({
      documentId,
      promptId: "system_design.materialize",
      defaultPrompt,
      segments: buildSystemDesignMaterializationPromptSegments({ existingPumlPaths }),
    });
    const scanNote = effectiveScanFolderPath
      ? `\n\nThe agent also explored codebase at: ${effectiveScanFolderPath}`
      : "";
    const reply = await runLocalAiChat({
      sessionKey: materializeKey,
      systemPrompt,
      prompt: `Conversation:\n\n${transcript}${scanNote}\n\nProduce both files now using the required delimiters.`,
      selection,
      stream,
      workspace: undefined,
      sessionMetadata: {
        "orchestra.disallowAgentBash": true,
        "orchestra.disallowAgentTools": ["Write", "Edit", "MultiEdit", "Bash"],
      },
    });
    return parseAndValidateMaterializedSystemDesign(reply);
  });

  ipcMain.removeHandler("systemDesign:chatSend");
  ipcMain.handle("systemDesign:chatSend", async (event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid systemDesign:chatSend payload");
    }
    const {
      sessionKey,
      documentId,
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
      documentId?: string;
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
    const effectiveScanFolderPath = await resolveScanFolderForPrompt(scanFolderPath, selection);

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

    const promptOptions = {
      activeFile,
      files,
      systemMd,
      scanFolderPath: effectiveScanFolderPath,
      mentionContexts,
    };
    const defaultPrompt = buildSystemDesignChatSystemPrompt(promptOptions);
    const systemPrompt = await resolveSystemPrompt({
      documentId,
      promptId: "system_design.chat",
      defaultPrompt,
      segments: buildSystemDesignChatPromptSegments(promptOptions),
      placeholders: { activeFile, systemMd },
    });
    const reply = await runLocalAiChat({
      sessionKey,
      systemPrompt,
      prompt,
      selection,
      stream,
      workspace: buildSystemDesignAgentWorkspace(
        effectiveScanFolderPath,
        Array.isArray(referencePaths) ? referencePaths : [],
      ),
    });
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

  ipcMain.removeHandler("systemDesign:ensureSaveFolder");
  ipcMain.handle("systemDesign:ensureSaveFolder", async (_event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid systemDesign:ensureSaveFolder payload");
    }
    const { path: folderPath, createIfMissing } = payload as {
      path?: string;
      createIfMissing?: boolean;
    };
    if (typeof folderPath !== "string" || !folderPath.trim()) {
      throw new Error("Save folder path is required");
    }
    const trimmed = folderPath.trim();
    const fs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const resolved = nodePath.resolve(trimmed);
    if (createIfMissing) {
      await fs.mkdir(resolved, { recursive: true });
      return { path: resolved };
    }
    const stat = await fs.stat(resolved);
    if (!stat.isDirectory()) {
      throw new Error("Selected path is not a folder");
    }
    return { path: resolved };
  });
}
