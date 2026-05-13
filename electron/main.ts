import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  chatFsMkdir,
  chatFsRemove,
  chatFsRename,
  ensureArchitectureDataDir,
  loadChat,
  readDocumentFiles,
  readDocumentIndex,
  getChatFolderPath,
  listChatFilesTree,
  removeLegacyPersistenceLayout,
  saveChat,
  writeDocumentFiles,
  writeDocumentIndex,
  readConversationsJson,
  readTemplatesJson,
  writeConversationsJson,
  writeTemplatesJson,
} from "./architectureFileIo.ts";
import { partitionChatReply } from "./markdownPatchFromReply.ts";
import { renderLatex } from "./latex/renderLatex.ts";
import { LocalAIProviderRuntime } from "@orchestra-ai-runtime";
import type { ModelInfo, ProcessSession } from "@orchestra-ai-runtime";
import type { LocalAiOptions, LocalAiSelection } from "../src/renderer/types/electron-api.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

const devPreloadPath = path.resolve(__dirname, "../dist-electron/preload.cjs");
const preloadPath = isDev
  ? (existsSync(devPreloadPath) ? devPreloadPath : path.join(__dirname, "preload.ts"))
  : path.join(__dirname, "preload.cjs");

function isItemsDocument(value: unknown): value is { items: unknown[] } {
  return Boolean(value && typeof value === "object" && Array.isArray((value as { items?: unknown }).items));
}

// ---------------------------------------------------------------------------
// orchestra-ai-runtime singleton for the markdown chat
// ---------------------------------------------------------------------------

let aiRuntime: LocalAIProviderRuntime | null = null;
let aiRuntimeInitializing: Promise<LocalAIProviderRuntime> | null = null;
let aiRuntimeShutdownStarted = false;
type LocalAiChatSessionEntry = {
  session: ProcessSession;
  provider: string;
  modelId: string;
  pending: Promise<unknown>;
};

const localAiChatSessions = new Map<string, LocalAiChatSessionEntry>();

async function getAiRuntime(): Promise<LocalAIProviderRuntime> {
  if (aiRuntime) return aiRuntime;
  if (aiRuntimeInitializing) return aiRuntimeInitializing;

  aiRuntimeInitializing = (async () => {
    const runtime = new LocalAIProviderRuntime();
    runtime.on("error", ({ error }) => {
      console.error("[orchestra-ai-runtime]", error.message, error.stack ?? "");
    });
    await runtime.initialize();
    aiRuntime = runtime;
    return runtime;
  })();

  return aiRuntimeInitializing;
}

async function shutdownAiRuntime(): Promise<void> {
  const runtime = aiRuntime ?? (aiRuntimeInitializing ? await aiRuntimeInitializing.catch(() => null) : null);
  localAiChatSessions.clear();
  aiRuntime = null;
  aiRuntimeInitializing = null;
  if (!runtime) return;
  await runtime.shutdown();
}

// ---------------------------------------------------------------------------
// Helpers shared by markdown + workspace chat
// ---------------------------------------------------------------------------

async function getLocalAiOptions(): Promise<LocalAiOptions> {
  const runtime = await getAiRuntime();
  const providers = runtime.availableProviders.map((adapter) => ({
    provider: adapter.provider,
    label: adapter.provider,
    category: adapter.category as "local-model" | "local-agent",
  }));
  const models = runtime.availableModels.map((m) => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    category: m.category as "local-model" | "local-agent",
  }));
  return { providers, models };
}

function resolveSelectedModel(
  runtime: LocalAIProviderRuntime,
  selection: LocalAiSelection | undefined,
) {
  if (selection?.provider) {
    const matched = runtime.availableModels.find(
      (m) =>
        m.provider === selection.provider &&
        (selection.modelId == null || m.id === selection.modelId),
    );
    if (matched) return matched;
  }
  return runtime.availableModels[0] ?? null;
}

async function getLocalAiChatSession(
  runtime: LocalAIProviderRuntime,
  sessionKey: string,
  model: ModelInfo,
  systemPrompt: string,
): Promise<LocalAiChatSessionEntry> {
  const existing = localAiChatSessions.get(sessionKey);
  const runtimeSession = runtime.getSession(sessionKey);
  const matchesModel =
    existing?.provider === model.provider &&
    existing.modelId === model.id &&
    runtimeSession === existing.session;

  if (
    existing &&
    runtimeSession &&
    matchesModel &&
    existing.session.status !== "closed" &&
    existing.session.status !== "error"
  ) {
    return existing;
  }

  if (existing) {
    localAiChatSessions.delete(sessionKey);
    await runtime.destroySession(existing.session.id).catch(() => false);
  } else if (runtimeSession) {
    await runtime.destroySession(runtimeSession.id).catch(() => false);
  }

  const session = runtime.createSession({
    id: sessionKey,
    provider: model.provider,
    modelId: model.id,
    systemPrompt,
  });
  if (!session) {
    throw new Error(
      `Não foi possível criar a sessão de IA para o provedor ${model.provider}. Verifique se o adapter está registrado.`,
    );
  }
  const entry: LocalAiChatSessionEntry = {
    session,
    provider: model.provider,
    modelId: model.id,
    pending: Promise.resolve(),
  };
  localAiChatSessions.set(sessionKey, entry);
  return entry;
}

async function collectLocalAiReply(session: ProcessSession, prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let tokenReply = "";
    let settled = false;

    const timeout = setTimeout(() => {
      settleError(new Error("AI response timeout (60s)"));
    }, 60_000);

    const cleanup = () => {
      clearTimeout(timeout);
      session.off("token", onToken);
      session.off("message", onMessage);
      session.off("error", onError);
      session.off("closed", onClosed);
      session.off("exit", onExit);
    };

    const settle = (value: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const settleError = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const onToken = ({ token }: { token: string }) => {
      tokenReply += token;
    };

    const onMessage = ({ message }: { message: { content: string } }) => {
      settle(message.content || tokenReply.trim());
    };

    const onError = ({ error }: { error: Error }) => {
      settleError(error);
    };

    const onClosed = () => {
      settle(tokenReply.trim() || [...session.messages].reverse().find((m) => m.role === "assistant")?.content || "");
    };

    const onExit = () => {
      settle(tokenReply.trim() || [...session.messages].reverse().find((m) => m.role === "assistant")?.content || "");
    };

    session.on("token", onToken);
    session.once("message", onMessage);
    session.once("error", onError);
    session.once("closed", onClosed);
    session.once("exit", onExit);

    void session.send(prompt);
  });
}

async function runLocalAiChat({
  sessionKey,
  systemPrompt,
  prompt,
  selection,
}: {
  sessionKey: string;
  systemPrompt: string;
  prompt: string;
  selection: LocalAiSelection | undefined;
}): Promise<string> {
  const runtime = await getAiRuntime();

  if (runtime.availableModels.length === 0) {
    return "Nenhum provedor de IA local foi encontrado. Instale Ollama, Claude CLI ou Cursor CLI e reinicie o app.";
  }

  const model = resolveSelectedModel(runtime, selection);
  if (!model) {
    return "Provedor ou modelo selecionado não encontrado. Verifique se está instalado e reinicie o app.";
  }

  const entry = await getLocalAiChatSession(runtime, sessionKey, model, systemPrompt);
  const reply = entry.pending
    .catch((e) => console.error(e))
    .then(() => collectLocalAiReply(entry.session, prompt));
  entry.pending = reply.catch(() => undefined);
  return reply;
}

function buildWorkspaceChatSystemPrompt(activeFile: string, files: Record<string, string>): string {
  const fileEntries = Object.entries(files)
    .map(([name, content]) => `### ${name}\n\`\`\`\n${content}\n\`\`\``)
    .join("\n\n");
  return `You are a helpful technical document editing assistant. The user is editing a document workspace.

Active file: ${activeFile}

Files in the workspace:
${fileEntries}

When you want to propose edits to a file, include a JSON code block with the following structure:

\`\`\`json
{
  "patch": {
    "file": "${activeFile}",
    "changes": [
      { "type": "replace_all", "content": "<full new content>" }
    ]
  }
}
\`\`\`

Available change types:
- \`replace_all\`: Replace the entire file content
- \`replace_block\`: Replace a specific block; requires \`target\` and \`content\`
- \`insert_after\`: Insert content after an anchor text; requires \`anchor\` and \`content\`
- \`insert_before\`: Insert content before an anchor text; requires \`anchor\` and \`content\`

If no file change is needed, respond with plain text only, without any JSON block.
When you include a patch, use exactly one \`\`\`json code block with the full patch object — do not repeat the same JSON later in the message, and do not paste raw JSON outside the fence.
Keep responses concise and focused.`;
}

function buildMarkdownChatSystemPrompt(activeFile: string, fileContent: string): string {
  return `You are a helpful markdown editing assistant. The user is editing a markdown document.

Active file: ${activeFile}

Current file content:
\`\`\`markdown
${fileContent}
\`\`\`

When you want to propose edits to the file, include a JSON code block with the following structure:

\`\`\`json
{
  "patch": {
    "file": "${activeFile}",
    "changes": [
      { "type": "replace_all", "content": "<full new content>" }
    ]
  }
}
\`\`\`

Available change types:
- \`replace_all\`: Replace the entire file content (use for large rewrites)
- \`replace_block\`: Replace a specific block; requires \`target\` (exact text to replace) and \`content\`
- \`insert_after\`: Insert content after an anchor text; requires \`anchor\` and \`content\`
- \`insert_before\`: Insert content before an anchor text; requires \`anchor\` and \`content\`

If no file change is needed, respond with plain text only, without any JSON block.
When you include a patch, use exactly one \`\`\`json code block with the full patch object — do not repeat the same JSON later in the message, and do not paste raw JSON outside the fence.
Keep responses concise and focused.`;
}

function registerIpc(): void {
  ipcMain.handle("latex:render", (_evt, payload: unknown) => renderLatex(payload));

  ipcMain.handle("architecture:readConversations", () => readConversationsJson());
  ipcMain.handle("architecture:readTemplates", () => readTemplatesJson());

  ipcMain.handle("architecture:writeConversations", (_evt, doc: unknown) => {
    if (!isItemsDocument(doc)) {
      throw new Error("Invalid conversations payload");
    }
    return writeConversationsJson(doc);
  });

  ipcMain.handle("architecture:writeTemplates", (_evt, doc: unknown) => {
    if (!isItemsDocument(doc)) {
      throw new Error("Invalid templates payload");
    }
    return writeTemplatesJson(doc);
  });

  ipcMain.handle("architecture:getDataDir", () => ensureArchitectureDataDir());

  ipcMain.handle("document:readIndex", (_evt, documentId: unknown) => {
    if (typeof documentId !== "string" || !documentId) throw new Error("Invalid document id");
    return readDocumentIndex(documentId);
  });
  ipcMain.handle("document:writeIndex", (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
    const { documentId, index } = payload as { documentId: string; index: unknown };
    if (typeof documentId !== "string" || !documentId || !index || typeof index !== "object") {
      throw new Error("Invalid document index payload");
    }
    return writeDocumentIndex(documentId, index as never);
  });
  ipcMain.handle("document:readFiles", (_evt, documentId: unknown) => {
    if (typeof documentId !== "string" || !documentId) throw new Error("Invalid document id");
    return readDocumentFiles(documentId);
  });
  ipcMain.handle("document:writeFiles", (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
    const { documentId, files } = payload as { documentId: string; files: Record<string, string> };
    if (typeof documentId !== "string" || !files || typeof files !== "object") {
      throw new Error("Invalid document files payload");
    }
    return writeDocumentFiles(documentId, files);
  });
  ipcMain.handle("chat:load", (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
    const { documentId, chatId } = payload as { documentId: string; chatId: string };
    if (typeof documentId !== "string" || typeof chatId !== "string") throw new Error("Invalid chat load payload");
    return loadChat(documentId, chatId);
  });
  ipcMain.handle("chat:save", (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
    const { documentId, chatId, detail } = payload as { documentId: string; chatId: string; detail: unknown };
    if (typeof documentId !== "string" || typeof chatId !== "string" || !detail || typeof detail !== "object") {
      throw new Error("Invalid chat save payload");
    }
    return saveChat(documentId, chatId, detail as never);
  });

  ipcMain.handle("chat:listFilesTree", (_evt, chatId: unknown) => {
    if (typeof chatId !== "string" || !chatId) {
      throw new Error("Invalid chat id");
    }
    return listChatFilesTree(chatId);
  });

  ipcMain.handle("chat:mkdir", (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
    const { chatId, relativePath } = payload as { chatId: string; relativePath: string };
    if (typeof chatId !== "string" || typeof relativePath !== "string") {
      throw new Error("Invalid mkdir payload");
    }
    return chatFsMkdir(chatId, relativePath);
  });

  ipcMain.handle("chat:rename", (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
    const { chatId, fromPath, toPath } = payload as { chatId: string; fromPath: string; toPath: string };
    if (typeof chatId !== "string" || typeof fromPath !== "string" || typeof toPath !== "string") {
      throw new Error("Invalid rename payload");
    }
    return chatFsRename(chatId, fromPath, toPath);
  });

  ipcMain.handle("chat:remove", (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
    const { chatId, relativePath } = payload as { chatId: string; relativePath: string };
    if (typeof chatId !== "string" || typeof relativePath !== "string") {
      throw new Error("Invalid remove payload");
    }
    return chatFsRemove(chatId, relativePath);
  });

  ipcMain.handle("chat:openFolder", (_evt, chatId: unknown) => {
    if (typeof chatId !== "string" || !chatId) {
      return { ok: false as const, error: "Invalid chat id" };
    }
    void (async () => {
      try {
        const folder = await getChatFolderPath(chatId);
        await shell.openPath(folder);
      } catch (e) {
        console.error(e);
      }
    })();
    return { ok: true as const };
  });

  ipcMain.handle("shell:openPath", (_evt, targetPath: unknown) => {
    if (typeof targetPath !== "string" || !targetPath) {
      return { ok: false, error: "Invalid path" };
    }
    const resolved = path.resolve(targetPath);
    const base = path.resolve(app.getPath("userData"));
    const rel = path.relative(base, resolved);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      return { ok: false, error: "Path must be under application userData" };
    }
    void shell.openPath(resolved);
    return { ok: true };
  });

  /** jsPDF/FileSaver often does nothing in Electron renderer; save via dialog + fs. */
  ipcMain.handle("pdf:saveWithDialog", async (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object") {
      return { ok: false as const, error: "Invalid payload" };
    }
    const { defaultFilename, data } = payload as { defaultFilename: string; data: ArrayBuffer };
    if (!(data instanceof ArrayBuffer) || typeof defaultFilename !== "string") {
      return { ok: false as const, error: "Invalid PDF payload" };
    }
    const result = await dialog.showSaveDialog({
      defaultPath: defaultFilename,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (result.canceled || !result.filePath) {
      return { ok: false as const, canceled: true };
    }
    await fs.writeFile(result.filePath, Buffer.from(data));
    return { ok: true as const, path: result.filePath };
  });

  ipcMain.handle("pdf:printCurrentWebContents", async (evt) => {
    const pdfBuffer = await evt.sender.printToPDF({
      pageSize: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margins: { marginType: "none" },
    });
    const data = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength,
    );
    return { ok: true as const, data };
  });

  ipcMain.handle("file:saveTextWithDialog", async (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object") {
      return { ok: false as const, error: "Invalid payload" };
    }
    const { content, defaultFilename, existingPath } = payload as {
      content: string;
      defaultFilename: string;
      existingPath?: string;
    };
    if (typeof content !== "string" || typeof defaultFilename !== "string") {
      return { ok: false as const, error: "Invalid text payload" };
    }

    if (typeof existingPath === "string" && existingPath.trim()) {
      await fs.writeFile(existingPath, content, "utf8");
      return { ok: true as const, path: existingPath };
    }

    const result = await dialog.showSaveDialog({
      defaultPath: defaultFilename,
      filters: [{ name: "Text", extensions: ["md", "markdown", "txt", "puml", "plantuml", "uml"] }],
    });
    if (result.canceled || !result.filePath) {
      return { ok: false as const, canceled: true };
    }
    await fs.writeFile(result.filePath, content, "utf8");
    return { ok: true as const, path: result.filePath };
  });

  ipcMain.handle("file:openTextWithDialog", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Text", extensions: ["md", "markdown", "txt", "puml", "plantuml", "uml"] }],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false as const, canceled: true };
    }
    const filePath = result.filePaths[0]!;
    const content = await fs.readFile(filePath, "utf8");
    return { ok: true as const, path: filePath, content };
  });

  ipcMain.handle("ai:listLocalOptions", async () => {
    try {
      return await getLocalAiOptions();
    } catch {
      return { providers: [], models: [] };
    }
  });

  ipcMain.handle("markdownChat:send", async (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid markdownChat:send payload");
    }
    const { sessionKey, activeFile, fileContent, prompt, aiSelection } = payload as {
      sessionKey: string;
      activeFile: string;
      fileContent: string;
      prompt: string;
      aiSelection?: LocalAiSelection;
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

    const systemPrompt = buildMarkdownChatSystemPrompt(activeFile, fileContent);
    const reply = await runLocalAiChat({ sessionKey, systemPrompt, prompt, selection: aiSelection });
    const { reply: cleanReply, patch } = partitionChatReply(reply, activeFile);
    return { reply: cleanReply, patch };
  });

  ipcMain.handle("workspaceChat:send", async (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid workspaceChat:send payload");
    }
    const { sessionKey, activeFile, files, prompt, aiSelection } = payload as {
      sessionKey: string;
      activeFile: string;
      files: Record<string, string>;
      prompt: string;
      aiSelection?: LocalAiSelection;
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

    const systemPrompt = buildWorkspaceChatSystemPrompt(activeFile, files);
    const reply = await runLocalAiChat({ sessionKey, systemPrompt, prompt, selection: aiSelection });
    const { reply: cleanReply, patch } = partitionChatReply(reply, activeFile);
    return { reply: cleanReply, patch };
  });
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    void win.loadURL(devServerUrl);
  } else {
    void win.loadFile(path.resolve(__dirname, "../dist/index.html"));
  }
};

registerIpc();

app.whenReady().then(() => {
  void removeLegacyPersistenceLayout();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", (event) => {
  if (aiRuntimeShutdownStarted) return;
  aiRuntimeShutdownStarted = true;
  event.preventDefault();
  void shutdownAiRuntime()
    .catch((error: unknown) => {
      console.error("Failed to shutdown AI runtime", error);
    })
    .finally(() => {
      app.quit();
    });
});
