import type {
  ChatConversationTab,
  ChatMessage,
  Commit,
  Conversation,
  ConversationKind,
  Patch,
  TechnicalTemplate,
  VaultPlanProposal,
} from "@/types";
import { isMarkdownVaultPath } from "@/lib/vaultPaths";

function defaultVaultActiveFile(files: Record<string, string>): string {
  if (files["vault-overview.md"]) return "vault-overview.md";
  const markdown = Object.keys(files).filter(isMarkdownVaultPath).sort();
  if (markdown[0]) return markdown[0];
  return Object.keys(files).sort()[0] ?? "";
}

type ApiChatMessage = {
  id: string;
  role: string;
  content: string;
  timestamp: string;
  systemTone?: "info" | "warning" | "error";
};

type ApiCommit = {
  id: string;
  message: string;
  patch: Patch;
  timestamp: string;
  author: string;
};

export type ApiConversationRow = {
  id: string;
  title: string;
  kind: string;
  templateId?: string | null;
  fileCount?: number;
  createdAt?: string;
  updatedAt?: string;
  files?: Record<string, string>;
  activeFile?: string;
  pendingPatch?: Patch | null;
  history?: ApiCommit[];
  chatMessages?: ApiChatMessage[];
  chatTabs?: Array<{
    id: string;
    title: string;
    messages?: ApiChatMessage[];
  }>;
  activeChatTabId?: string;
  openChatTabIds?: string[];
  savedSnapshot?: Record<string, string>;
  openEditorTabs?: string[];
  referenceFolderPath?: string;
  referenceExcerpt?: string;
  scanFolderPath?: string;
  referencePaths?: string[];
  systemContextCompletedAt?: string;
  pendingVaultProposal?: VaultPlanProposal | null;
  vaultName?: string;
  vaultRootPath?: string;
  vaultCategory?: import("@/types/electron-api").VaultCategory;
};

function normalizeOpenEditorTabsForConversation(
  files: Record<string, string>,
  activeFile: string,
  openEditorTabs?: string[],
): string[] {
  const keys = new Set(Object.keys(files));
  const filtered = (openEditorTabs ?? []).filter((f) => keys.has(f));
  if (filtered.length > 0) return filtered;
  if (keys.has(activeFile)) return [activeFile];
  const sorted = [...keys].sort();
  return sorted[0] ? [sorted[0]] : [];
}

function mapChatMessage(row: ApiChatMessage): ChatMessage {
  const role = row.role === "user" || row.role === "assistant" || row.role === "system" ? row.role : "system";
  const systemTone =
    row.systemTone === "info" || row.systemTone === "warning" || row.systemTone === "error"
      ? row.systemTone
      : undefined;
  return {
    id: row.id,
    role,
    content: row.content,
    timestamp: row.timestamp,
    ...(role === "system" && systemTone ? { systemTone } : {}),
  };
}

function normalizeChatTabsForConversation(row: ApiConversationRow): {
  chatTabs: ChatConversationTab[];
  activeChatTabId: string;
  chatMessages: ChatMessage[];
} {
  const mappedTabs = (row.chatTabs ?? [])
    .filter((tab) => typeof tab.id === "string" && tab.id.length > 0)
    .map((tab, index) => ({
      id: tab.id,
      title: tab.title?.trim() || `Chat ${index + 1}`,
      messages: (tab.messages ?? []).map(mapChatMessage),
    }));
  const fallbackMessages = (row.chatMessages ?? []).map(mapChatMessage);
  const tabs =
    mappedTabs.length > 0
      ? mappedTabs
      : [
          {
            id: crypto.randomUUID(),
            title: "Chat 1",
            messages: fallbackMessages,
          },
        ];
  const activeTab = tabs.find((tab) => tab.id === row.activeChatTabId) ?? tabs[0];
  return {
    chatTabs: tabs,
    activeChatTabId: activeTab.id,
    chatMessages: activeTab.messages,
  };
}

function mapCommit(row: ApiCommit): Commit {
  const ts = row.timestamp;
  const timestamp =
    typeof ts === "string" ? ts : ts != null && typeof (ts as { toISOString?: () => string }).toISOString === "function"
      ? (ts as Date).toISOString()
      : String(ts);

  const author = row.author === "user" ? "user" : "ai";
  return {
    id: row.id,
    message: row.message,
    patch: row.patch,
    timestamp,
    author,
  };
}

export function mapApiConversation(row: ApiConversationRow): Conversation {
  const kind: ConversationKind =
    row.kind === "system_design" || row.kind === "uml"
      ? "system_design"
      : row.kind === "vault"
        ? "vault"
        : "technical_document";
  const files = row.files && Object.keys(row.files).length > 0 ? { ...row.files } : {};
  const activeFile =
    row.activeFile &&
    (files[row.activeFile] ||
      row.pendingVaultProposal?.changes.some((c) => c.path === row.activeFile) ||
      (kind === "vault" && Boolean(row.vaultRootPath)))
      ? row.activeFile
      : kind === "system_design"
        ? Object.keys(files).find((k) => k.endsWith(".puml")) ?? "diagrams/context.puml"
        : kind === "vault"
          ? defaultVaultActiveFile(files)
          : "main.tex";

  const savedSnapshot =
    row.savedSnapshot && Object.keys(row.savedSnapshot).length > 0 ? { ...row.savedSnapshot } : { ...files };
  const { chatTabs, activeChatTabId, chatMessages } = normalizeChatTabsForConversation(row);
  const openChatTabIds =
    row.openChatTabIds?.filter((id) => chatTabs.some((tab) => tab.id === id)) ??
    chatTabs.map((tab) => tab.id);

  return {
    id: row.id,
    title: row.title,
    kind,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    templateId: row.templateId ?? null,
    files,
    activeFile,
    openEditorTabs: normalizeOpenEditorTabsForConversation(files, activeFile, row.openEditorTabs),
    pendingPatch: row.pendingPatch ?? null,
    history: (row.history ?? []).map(mapCommit),
    chatTabs,
    openChatTabIds,
    activeChatTabId,
    chatMessages,
    savedSnapshot,
    referenceFolderPath: row.referenceFolderPath,
    referenceExcerpt: row.referenceExcerpt,
    scanFolderPath: row.scanFolderPath,
    referencePaths: row.referencePaths ?? [],
    systemContextCompletedAt: row.systemContextCompletedAt,
    pendingVaultProposal: row.pendingVaultProposal ?? null,
    vaultName: row.vaultName,
    vaultRootPath: row.vaultRootPath,
    vaultCategory: row.vaultCategory,
  };
}

export type ApiTemplateRow = {
  id: string;
  name: string;
  description: string;
  files: Record<string, string>;
  updatedAt?: string;
};

export function mapApiTemplate(row: ApiTemplateRow): TechnicalTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    files: { ...row.files },
  };
}
