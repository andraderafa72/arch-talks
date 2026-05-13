/** Mirrors main-process IPC contracts (keep in sync with electron/latex/types.ts). */

// ---------------------------------------------------------------------------
// Local AI selection
// ---------------------------------------------------------------------------

export type LocalAiProviderCategory = "local-model" | "local-agent";

export type LocalAiProviderOption = {
  provider: string;
  label: string;
  category: LocalAiProviderCategory;
};

export type LocalAiModelOption = {
  id: string;
  name: string;
  provider: string;
  category: LocalAiProviderCategory;
};

export type LocalAiOptions = {
  providers: LocalAiProviderOption[];
  models: LocalAiModelOption[];
};

export type LocalAiSelection = {
  provider: string;
  modelId?: string;
};

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export type MarkdownChatChange =
  | { type: "insert_after"; anchor: string; content: string }
  | { type: "insert_before"; anchor: string; content: string }
  | { type: "replace_block"; target: string; content: string }
  | { type: "replace_all"; content: string };

export type MarkdownChatPatch = {
  file: string;
  changes: MarkdownChatChange[];
};

export type MarkdownChatRequest = {
  sessionKey: string;
  activeFile: string;
  fileContent: string;
  prompt: string;
  aiSelection?: LocalAiSelection;
};

export type MarkdownChatResponse = {
  reply: string;
  patch?: MarkdownChatPatch;
};

export type WorkspaceChatRequest = {
  sessionKey: string;
  activeFile: string;
  files: Record<string, string>;
  prompt: string;
  aiSelection?: LocalAiSelection;
};

export type WorkspaceChatResponse = {
  reply: string;
  patch?: MarkdownChatPatch;
};

export type LatexOutputFormat = "pdf" | "svg";

export type LatexErrorCode = "VALIDATION" | "TIMEOUT" | "TECTONIC" | "IO" | "UNSUPPORTED";

export type LatexRenderRequest = {
  mainFile?: string;
  files: Record<string, string>;
  format?: LatexOutputFormat;
  timeoutMs?: number;
  content?: string;
};

export type LatexRenderResult = {
  success: boolean;
  outputPath?: string;
  error?: string;
  code?: LatexErrorCode;
  stderr?: string;
};

export type FsTreeNode = {
  path: string;
  name: string;
  kind: "file" | "dir";
  children?: FsTreeNode[];
};

export type ElectronApi = {
  platform: string;
  renderLatex: (req: LatexRenderRequest) => Promise<LatexRenderResult>;
  openPathInUserData: (p: string) => Promise<{ ok: boolean; error?: string }>;
  readArchitectureConversations: () => Promise<{ items: unknown[] }>;
  readArchitectureTemplates: () => Promise<{ items: unknown[] }>;
  writeArchitectureConversations: (doc: { items: unknown[] }) => Promise<void>;
  writeArchitectureTemplates: (doc: { items: unknown[] }) => Promise<void>;
  getArchitectureDataDir: () => Promise<string>;
  readDocumentIndex?: (documentId: string) => Promise<unknown>;
  writeDocumentIndex?: (documentId: string, index: unknown) => Promise<void>;
  readDocumentFiles?: (documentId: string) => Promise<Record<string, string>>;
  writeDocumentFiles?: (documentId: string, files: Record<string, string>) => Promise<void>;
  chatLoad?: (documentId: string, chatId: string) => Promise<unknown>;
  chatSave?: (documentId: string, chatId: string, detail: unknown) => Promise<void>;
  chatListFilesTree?: (chatId: string) => Promise<FsTreeNode[]>;
  chatMkdir?: (chatId: string, relativePath: string) => Promise<void>;
  chatRename?: (chatId: string, fromPath: string, toPath: string) => Promise<void>;
  chatRemove?: (chatId: string, relativePath: string) => Promise<void>;
  chatOpenFolder?: (chatId: string) => Promise<{ ok: true } | { ok: false; error?: string }>;
  savePdfWithDialog: (
    data: ArrayBuffer,
    defaultFilename: string,
  ) => Promise<{ ok: true; path: string } | { ok: false; canceled?: boolean; error?: string }>;
  saveTextWithDialog: (
    content: string,
    defaultFilename: string,
    existingPath?: string,
  ) => Promise<{ ok: true; path: string } | { ok: false; canceled?: boolean; error?: string }>;
  openTextWithDialog: () => Promise<
    { ok: true; path: string; content: string } | { ok: false; canceled?: boolean; error?: string }
  >;
  printCurrentWebContentsToPdf: () => Promise<
    { ok: true; data: ArrayBuffer } | { ok: false; error: string }
  >;
  markdownChatSend?: (req: MarkdownChatRequest) => Promise<MarkdownChatResponse>;
  workspaceChatSend?: (req: WorkspaceChatRequest) => Promise<WorkspaceChatResponse>;
  aiListLocalOptions?: () => Promise<LocalAiOptions>;
};

declare global {
  interface Window {
    electronApi?: ElectronApi;
  }
}

export {};
