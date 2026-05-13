import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

export const ARCHITECTURE_FOLDER_NAME = "ArchitectureFiles";
const DOCUMENTS_SUBDIR = "documents";
const FILES_SUBDIR = "files";
const CHATS_SUBDIR = "chats";
const CHATS_INDEX_NAME = "index.json";
const CHATS_HISTORY_SUBDIR = "history";
const TEMPLATES_NAME = "templates.json";
const LEGACY_CHAT_ROOT = "chats";
const LEGACY_CONVERSATIONS = "conversations.json";

export type JsonDocument<T> = { items: T[] };
export type FsTreeNode = { path: string; name: string; kind: "file" | "dir"; children?: FsTreeNode[] };

export type ChatIndexItem = {
  id: string;
  title: string;
};

export type DocumentMeta = {
  id: string;
  title: string;
  kind: string;
  templateId?: string | null;
  updatedAt?: string;
  activeFile?: string;
  pendingPatch?: unknown;
  savedSnapshot?: Record<string, string>;
  openEditorTabs?: string[];
  activeChatTabId?: string;
  chatTabs?: ChatIndexItem[];
  fileCount?: number;
};

export type ChatDetail = {
  chatId: string;
  messages: unknown[];
  history: unknown[];
};

function isSafeId(id: string): boolean {
  if (!id || id.length > 200) return false;
  if (id.includes("..") || id.includes("/") || id.includes("\\")) return false;
  return /^[a-fA-F0-9-]{36}$/.test(id) || /^[a-zA-Z0-9_-]+$/.test(id);
}

function normalizeRelativePath(rel: string): string {
  const s = rel.trim().replace(/\\/g, "/");
  const parts = s.split("/").filter((p) => p && p !== ".");
  if (parts.some((p) => p === "..")) throw new Error("Invalid path");
  return parts.join("/");
}

function resolveUnder(filesRoot: string, relativePosix: string): string {
  const normalized = normalizeRelativePath(relativePosix);
  if (!normalized) throw new Error("Invalid path");
  const full = path.join(filesRoot, ...normalized.split("/"));
  const resolved = path.resolve(full);
  const rootResolved = path.resolve(filesRoot);
  if (!resolved.startsWith(rootResolved + path.sep) && resolved !== rootResolved) {
    throw new Error("Path escape");
  }
  return resolved;
}

async function atomicWriteUtf8(targetPath: string, contents: string): Promise<void> {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const tmp = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, contents, "utf8");
  try {
    await fs.rename(tmp, targetPath);
  } catch {
    try {
      await fs.unlink(targetPath);
    } catch {
      /* ignore */
    }
    await fs.rename(tmp, targetPath);
  }
}

function isLikelyBinaryAsset(relPath: string): boolean {
  const lower = relPath.toLowerCase();
  return lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".gif");
}

function conversationStringToBuffer(content: string): Buffer {
  const m = /^data:image\/(?:png|jpeg|gif);base64,(.+)$/.exec(content.trim());
  if (m) return Buffer.from(m[1], "base64");
  return Buffer.from(content, "utf8");
}

function getDataRoot(): string {
  return path.join(app.getPath("documents"), ARCHITECTURE_FOLDER_NAME, "data");
}

function getDocumentsRoot(): string {
  return path.join(getDataRoot(), DOCUMENTS_SUBDIR);
}

function getDocumentRoot(documentId: string): string {
  return path.join(getDocumentsRoot(), documentId);
}

function getDocumentFilesRoot(documentId: string): string {
  return path.join(getDocumentRoot(documentId), FILES_SUBDIR);
}

function getDocumentChatsRoot(documentId: string): string {
  return path.join(getDocumentRoot(documentId), CHATS_SUBDIR);
}

function getDocumentChatsIndexPath(documentId: string): string {
  return path.join(getDocumentChatsRoot(documentId), CHATS_INDEX_NAME);
}

function getDocumentChatHistoryPath(documentId: string, chatId: string): string {
  return path.join(getDocumentChatsRoot(documentId), CHATS_HISTORY_SUBDIR, `${chatId}.json`);
}

export async function ensureArchitectureDataDir(): Promise<string> {
  const root = getDataRoot();
  await fs.mkdir(root, { recursive: true });
  await fs.mkdir(getDocumentsRoot(), { recursive: true });
  return root;
}

async function loadFiles(filesRoot: string, relPrefix: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
  try {
    entries = await fs.readdir(path.join(filesRoot, relPrefix), { withFileTypes: true });
  } catch {
    return out;
  }
  const base = relPrefix ? `${relPrefix}/` : "";
  for (const ent of entries) {
    const rel = base + ent.name;
    if (ent.isDirectory()) {
      Object.assign(out, await loadFiles(filesRoot, rel));
    } else if (ent.isFile()) {
      const abs = path.join(filesRoot, ...rel.split("/"));
      const buf = await fs.readFile(abs);
      if (isLikelyBinaryAsset(rel)) {
        const ext = rel.toLowerCase().endsWith(".png") ? "png" : rel.toLowerCase().endsWith(".gif") ? "gif" : "jpeg";
        out[rel] = `data:image/${ext};base64,${buf.toString("base64")}`;
      } else {
        out[rel] = buf.toString("utf8");
      }
    }
  }
  return out;
}

async function pruneFilesNotIn(filesRoot: string, relativePaths: Set<string>): Promise<void> {
  async function walk(absDir: string, relPrefix: string): Promise<void> {
    let list: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
    try {
      list = await fs.readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    const base = relPrefix ? `${relPrefix}/` : "";
    for (const ent of list) {
      const rel = base + ent.name;
      const abs = path.join(absDir, ent.name);
      if (ent.isDirectory()) {
        await walk(abs, rel);
        const remaining = await fs.readdir(abs).catch(() => []);
        if (remaining.length === 0) await fs.rmdir(abs).catch(() => undefined);
      } else if (ent.isFile() && !relativePaths.has(rel)) {
        await fs.unlink(abs).catch(() => undefined);
      }
    }
  }
  await walk(filesRoot, "");
}

async function readDocumentMeta(documentId: string): Promise<DocumentMeta | null> {
  const indexPath = getDocumentChatsIndexPath(documentId);
  try {
    const raw = await fs.readFile(indexPath, "utf8");
    const parsed = JSON.parse(raw) as DocumentMeta;
    return { ...parsed, id: documentId };
  } catch {
    return null;
  }
}

export async function writeDocumentIndex(documentId: string, meta: DocumentMeta): Promise<void> {
  if (!isSafeId(documentId)) throw new Error("Invalid document id");
  const payload: DocumentMeta = {
    ...meta,
    id: documentId,
    fileCount: meta.fileCount ?? 0,
    updatedAt: meta.updatedAt ?? new Date().toISOString(),
    chatTabs: (meta.chatTabs ?? []).map((tab) => ({ id: tab.id, title: tab.title })),
  };
  await atomicWriteUtf8(getDocumentChatsIndexPath(documentId), `${JSON.stringify(payload, null, 2)}\n`);
}

export async function readDocumentIndex(documentId: string): Promise<DocumentMeta> {
  if (!isSafeId(documentId)) throw new Error("Invalid document id");
  const meta = await readDocumentMeta(documentId);
  if (!meta) {
    return {
      id: documentId,
      title: "Untitled",
      kind: "technical_document",
      templateId: null,
      activeFile: "main.tex",
      fileCount: 0,
      chatTabs: [{ id: "chat-1", title: "Chat 1" }],
      activeChatTabId: "chat-1",
      pendingPatch: null,
      savedSnapshot: {},
    };
  }
  return meta;
}

export async function loadChat(documentId: string, chatId: string): Promise<ChatDetail> {
  if (!isSafeId(documentId) || !isSafeId(chatId)) throw new Error("Invalid ids");
  const p = getDocumentChatHistoryPath(documentId, chatId);
  try {
    const raw = await fs.readFile(p, "utf8");
    const parsed = JSON.parse(raw) as ChatDetail;
    return {
      chatId,
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return { chatId, messages: [], history: [] };
  }
}

export async function saveChat(documentId: string, chatId: string, detail: ChatDetail): Promise<void> {
  if (!isSafeId(documentId) || !isSafeId(chatId)) throw new Error("Invalid ids");
  const payload: ChatDetail = {
    chatId,
    messages: Array.isArray(detail.messages) ? detail.messages : [],
    history: Array.isArray(detail.history) ? detail.history : [],
  };
  await atomicWriteUtf8(getDocumentChatHistoryPath(documentId, chatId), `${JSON.stringify(payload, null, 2)}\n`);
}

export async function readDocumentFiles(documentId: string): Promise<Record<string, string>> {
  if (!isSafeId(documentId)) throw new Error("Invalid document id");
  const root = getDocumentFilesRoot(documentId);
  await fs.mkdir(root, { recursive: true });
  return loadFiles(root, "");
}

export async function writeDocumentFiles(documentId: string, files: Record<string, string>): Promise<void> {
  if (!isSafeId(documentId)) throw new Error("Invalid document id");
  const filesRoot = getDocumentFilesRoot(documentId);
  await fs.mkdir(filesRoot, { recursive: true });
  const desired = new Set(Object.keys(files).map((k) => normalizeRelativePath(k)));
  await pruneFilesNotIn(filesRoot, desired);
  for (const [rel, content] of Object.entries(files)) {
    const safeRel = normalizeRelativePath(rel);
    const target = resolveUnder(filesRoot, safeRel);
    await fs.mkdir(path.dirname(target), { recursive: true });
    if (isLikelyBinaryAsset(safeRel)) {
      await fs.writeFile(target, conversationStringToBuffer(content));
    } else {
      await fs.writeFile(target, content, "utf8");
    }
  }
}

export async function readArchitectureConversationsUnified(): Promise<JsonDocument<unknown>> {
  await ensureArchitectureDataDir();
  const docsRoot = getDocumentsRoot();
  const entries = await fs.readdir(docsRoot, { withFileTypes: true }).catch(() => []);
  const items: unknown[] = [];
  for (const ent of entries) {
    if (!ent.isDirectory() || !isSafeId(ent.name)) continue;
    const documentId = ent.name;
    const meta = await readDocumentIndex(documentId);
    const files = await readDocumentFiles(documentId);
    items.push({
      id: documentId,
      title: meta.title,
      kind: meta.kind,
      templateId: meta.templateId ?? null,
      updatedAt: meta.updatedAt,
      fileCount: Object.keys(files).length,
      files,
      activeFile: meta.activeFile ?? "main.tex",
      pendingPatch: meta.pendingPatch ?? null,
      savedSnapshot: meta.savedSnapshot ?? {},
      openEditorTabs: meta.openEditorTabs ?? [],
      chatTabs: (meta.chatTabs ?? []).map((tab) => ({ id: tab.id, title: tab.title })),
      activeChatTabId: meta.activeChatTabId ?? meta.chatTabs?.[0]?.id ?? "",
      chatMessages: [],
      history: [],
    });
  }
  return { items };
}

export async function writeAllChatsFromDocument(doc: JsonDocument<unknown>): Promise<void> {
  await ensureArchitectureDataDir();
  const keepIds = new Set<string>();
  for (const item of doc.items) {
    const row = item as {
      id: string;
      title: string;
      kind: string;
      templateId?: string | null;
      updatedAt?: string;
      activeFile?: string;
      pendingPatch?: unknown;
      savedSnapshot?: Record<string, string>;
      openEditorTabs?: string[];
      files?: Record<string, string>;
      chatTabs?: ChatIndexItem[];
      activeChatTabId?: string;
      chatMessages?: unknown[];
      history?: unknown[];
    };
    if (!row.id || !isSafeId(row.id)) continue;
    keepIds.add(row.id);
    const files = row.files ?? {};
    await writeDocumentFiles(row.id, files);
    await writeDocumentIndex(row.id, {
      id: row.id,
      title: row.title,
      kind: row.kind,
      templateId: row.templateId ?? null,
      updatedAt: row.updatedAt,
      activeFile: row.activeFile,
      pendingPatch: row.pendingPatch ?? null,
      savedSnapshot: row.savedSnapshot ?? {},
      openEditorTabs: row.openEditorTabs ?? [],
      fileCount: Object.keys(files).length,
      chatTabs: row.chatTabs ?? [{ id: "chat-1", title: "Chat 1" }],
      activeChatTabId: row.activeChatTabId ?? row.chatTabs?.[0]?.id ?? "chat-1",
    });
    const activeChatId = row.activeChatTabId ?? row.chatTabs?.[0]?.id;
    if (activeChatId) {
      await saveChat(row.id, activeChatId, {
        chatId: activeChatId,
        messages: row.chatMessages ?? [],
        history: row.history ?? [],
      });
    }
  }
  const docsRoot = getDocumentsRoot();
  const existing = await fs.readdir(docsRoot, { withFileTypes: true }).catch(() => []);
  for (const ent of existing) {
    if (!ent.isDirectory() || !isSafeId(ent.name)) continue;
    if (!keepIds.has(ent.name)) await fs.rm(path.join(docsRoot, ent.name), { recursive: true, force: true });
  }
}

export async function removeLegacyPersistenceLayout(): Promise<void> {
  const dataRoot = getDataRoot();
  await fs.rm(path.join(dataRoot, LEGACY_CHAT_ROOT), { recursive: true, force: true }).catch(() => undefined);
  await fs.rm(path.join(dataRoot, LEGACY_CONVERSATIONS), { force: true }).catch(() => undefined);
}

export async function readConversationsJson(): Promise<JsonDocument<unknown>> {
  return readArchitectureConversationsUnified();
}

export async function writeConversationsJson(doc: JsonDocument<unknown>): Promise<void> {
  await writeAllChatsFromDocument(doc);
}

export async function readTemplatesJson(): Promise<JsonDocument<unknown>> {
  const filePath = path.join(getDataRoot(), TEMPLATES_NAME);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as JsonDocument<unknown>;
    return Array.isArray(parsed?.items) ? parsed : { items: [] };
  } catch {
    return { items: [] };
  }
}

export async function writeTemplatesJson(doc: JsonDocument<unknown>): Promise<void> {
  await ensureArchitectureDataDir();
  await atomicWriteUtf8(path.join(getDataRoot(), TEMPLATES_NAME), `${JSON.stringify(doc, null, 2)}\n`);
}

function sortTreeNodes(nodes: FsTreeNode[]): FsTreeNode[] {
  return nodes
    .map((n) => (n.kind === "dir" && n.children ? { ...n, children: sortTreeNodes(n.children) } : n))
    .sort((a, b) => (a.kind !== b.kind ? (a.kind === "dir" ? -1 : 1) : a.name.localeCompare(b.name)));
}

export async function listChatFilesTree(documentId: string): Promise<FsTreeNode[]> {
  if (!isSafeId(documentId)) throw new Error("Invalid document id");
  const filesRoot = getDocumentFilesRoot(documentId);
  await fs.mkdir(filesRoot, { recursive: true });
  async function build(absDir: string, relPrefix: string): Promise<FsTreeNode[]> {
    const list = await fs.readdir(absDir, { withFileTypes: true }).catch(() => []);
    const base = relPrefix ? `${relPrefix}/` : "";
    const nodes: FsTreeNode[] = [];
    for (const ent of list) {
      const rel = base + ent.name;
      const abs = path.join(absDir, ent.name);
      if (ent.isDirectory()) {
        const children = await build(abs, rel);
        nodes.push({ path: rel, name: ent.name, kind: "dir", children: sortTreeNodes(children) });
      } else {
        nodes.push({ path: rel, name: ent.name, kind: "file" });
      }
    }
    return nodes;
  }
  return sortTreeNodes(await build(filesRoot, ""));
}

export async function chatFsMkdir(documentId: string, relativeDir: string): Promise<void> {
  const filesRoot = getDocumentFilesRoot(documentId);
  await fs.mkdir(resolveUnder(filesRoot, normalizeRelativePath(relativeDir)), { recursive: true });
}

export async function chatFsRename(documentId: string, fromRel: string, toRel: string): Promise<void> {
  const filesRoot = getDocumentFilesRoot(documentId);
  const from = resolveUnder(filesRoot, normalizeRelativePath(fromRel));
  const to = resolveUnder(filesRoot, normalizeRelativePath(toRel));
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.rename(from, to);
}

export async function chatFsRemove(documentId: string, relativePath: string): Promise<void> {
  const filesRoot = getDocumentFilesRoot(documentId);
  const abs = resolveUnder(filesRoot, normalizeRelativePath(relativePath));
  const st = await fs.stat(abs);
  if (st.isDirectory()) await fs.rm(abs, { recursive: true, force: true });
  else await fs.unlink(abs);
}

export async function getChatFolderPath(documentId: string): Promise<string> {
  const dir = getDocumentRoot(documentId);
  await fs.mkdir(path.join(dir, FILES_SUBDIR), { recursive: true });
  return dir;
}
