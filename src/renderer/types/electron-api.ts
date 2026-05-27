/** Mirrors main-process IPC contracts (keep in sync with electron/latex/types.ts). */

import type { IntegrationId } from "../../../shared/integrations.ts";

export type { IntegrationId };

export type IntegrationHealthResult = {
  id: IntegrationId;
  ok: boolean;
  error?: string;
};

export type IntegrationCheckResponse =
  | { ok: true; results: IntegrationHealthResult[] }
  | { ok: false; error: string };

export type IntegrationRunStartResponse = {
  ok: boolean;
  error?: string;
  pid?: number;
};

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

export type AiChatStreamPayload = {
  streamId: string;
  text: string;
};

export type MarkdownChatRequest = {
  sessionKey: string;
  activeFile: string;
  fileContent: string;
  prompt: string;
  aiSelection?: LocalAiSelection;
  /** When set, main process sends incremental `aiChat:stream` events with accumulated assistant text. */
  streamId?: string;
};

export type MarkdownChatResponse = {
  reply: string;
  patch?: MarkdownChatPatch;
};

/** Same payload/response as markdown chat; main uses a PlantUML-focused system prompt. */
export type UmlChatRequest = MarkdownChatRequest;
export type UmlChatResponse = MarkdownChatResponse;

export type WorkspaceChatRequest = {
  sessionKey: string;
  activeFile: string;
  files: Record<string, string>;
  prompt: string;
  aiSelection?: LocalAiSelection;
  streamId?: string;
};

export type WorkspaceChatResponse = {
  reply: string;
  patch?: MarkdownChatPatch;
};

export type SystemDesignContextChatRequest = {
  sessionKey: string;
  prompt: string;
  aiSelection?: LocalAiSelection;
  streamId?: string;
  scanFolderPath?: string;
};

export type SystemDesignContextChatResponse = {
  reply: string;
};

export type SystemDesignMaterializeRequest = {
  sessionKey: string;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  aiSelection?: LocalAiSelection;
  streamId?: string;
  scanFolderPath?: string;
};

export type SystemDesignMaterializeResponse = {
  systemMd: string;
};

export type SystemDesignChatRequest = {
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

export type SystemDesignChatResponse = {
  reply: string;
  patch?: MarkdownChatPatch;
};

export type SystemDesignReferenceEntry = {
  token: string;
  label: string;
  group: string;
  isDirectory: boolean;
};

export type SystemDesignListReferenceEntriesRequest = {
  referencePaths: string[];
  query: string;
};

export type SystemDesignListReferenceEntriesResponse = {
  entries: SystemDesignReferenceEntry[];
};

// ---------------------------------------------------------------------------
// Vault ingestion
// ---------------------------------------------------------------------------

export type SemanticArtifactType =
  | "concept"
  | "rule"
  | "overview"
  | "decision"
  | "pattern"
  | "anti_pattern"
  | "workflow"
  | "entity"
  | "glossary"
  | "incident"
  | "constraint"
  | "heuristic"
  | "mapping";

export type SemanticRelationship = {
  type:
    | "depends_on"
    | "extends"
    | "contradicts"
    | "replaces"
    | "related_to"
    | "caused_by"
    | "enables"
    | "constrained_by";
  target: string;
};

export type VaultIngestionPlanEntry = {
  path: string;
  content: string;
  topic_id?: string;
  title?: string;
  type?: SemanticArtifactType;
  confidence?: "high" | "medium" | "low";
  keywords?: string[];
  embedding_keywords?: string[];
  relationships?: SemanticRelationship[];
  artifact_id?: string;
};

export type VaultIngestionPlan = {
  summary: string;
  batch_index?: number;
  batch_total?: number;
  files_total_count?: number;
  creates: VaultIngestionPlanEntry[];
  updates: VaultIngestionPlanEntry[];
};

export type VaultIngestionSummary = {
  topicCount: number;
  batches: number;
  filesReady: number;
  declaredFileCount?: number;
  topics: { title: string; type: string }[];
};

export type VaultChatRequest = {
  sessionKey: string;
  documentId: string;
  activeFile: string;
  files: Record<string, string>;
  prompt: string;
  /** Full tab conversation; used for ingestion source text and conversational context. */
  messages?: { role: "user" | "assistant" | "system"; content: string }[];
  aiSelection?: LocalAiSelection;
  streamId?: string;
  referenceFolderPath?: string;
  referenceExcerpt?: string;
};

export type VaultChatResponse = {
  reply: string;
  ingestionSummary?: VaultIngestionSummary;
  plan?: VaultIngestionPlan;
  validationErrors?: string[];
  validationWarnings?: string[];
};

export type VaultConsumptionChatRequest = {
  sessionKey: string;
  documentId: string;
  activeFile: string;
  files: Record<string, string>;
  prompt: string;
  aiSelection?: LocalAiSelection;
  streamId?: string;
  skillId?: string;
  vaultName?: string;
};

export type VaultConsumptionChatResponse = {
  reply: string;
};

export type VaultConfirmedChange = {
  path: string;
  content: string;
};

export type VaultApplyPlanRequest = {
  documentId: string;
  changes: VaultConfirmedChange[];
  plan?: VaultIngestionPlan;
};

export type VaultApplyPlanResponse = {
  files: Record<string, string>;
  updatedPaths: string[];
};

export type VaultReferenceScanResult = {
  excerpt: string;
  fileCount: number;
  truncated: boolean;
};

export type VaultCategory = "business" | "technical" | "project";

export type ArchVaultConfig = {
  version: 2;
  name: string;
  createdAt: string;
  documentId: string;
  vaultRootPath: string;
  category: VaultCategory;
};

export type VaultInitializeRequest = {
  documentId: string;
  name: string;
  category: VaultCategory;
  mode: "existing" | "new";
  existingRootPath?: string;
  parentPath?: string;
  newFolderName?: string;
};

export type VaultAssignCategoryRequest = {
  documentId: string;
  category: VaultCategory;
};

export type VaultInitializeResponse = {
  vaultRootPath: string;
  archConfig: ArchVaultConfig | null;
  vaultCategory: VaultCategory;
  files: Record<string, string>;
  diskPaths: string[];
  activeFile: string;
};

export type VaultAssignCategoryResponse = {
  vaultCategory: VaultCategory;
  archConfig: ArchVaultConfig;
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
  isFramelessShell?: boolean;
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
  readUserPreferences?: () => Promise<unknown | null>;
  writeUserPreferences?: (
    preferences: unknown,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  markdownChatSend?: (req: MarkdownChatRequest) => Promise<MarkdownChatResponse>;
  umlChatSend?: (req: UmlChatRequest) => Promise<UmlChatResponse>;
  workspaceChatSend?: (req: WorkspaceChatRequest) => Promise<WorkspaceChatResponse>;
  systemDesignContextChatSend?: (
    req: SystemDesignContextChatRequest,
  ) => Promise<SystemDesignContextChatResponse>;
  systemDesignMaterializeSystemMd?: (
    req: SystemDesignMaterializeRequest,
  ) => Promise<SystemDesignMaterializeResponse>;
  systemDesignChatSend?: (req: SystemDesignChatRequest) => Promise<SystemDesignChatResponse>;
  systemDesignListReferenceEntries?: (
    req: SystemDesignListReferenceEntriesRequest,
  ) => Promise<SystemDesignListReferenceEntriesResponse>;
  systemDesignGetChatFolderPath?: (documentId: string) => Promise<{ path: string }>;
  pickDirectory?: () => Promise<{ ok: true; path: string } | { ok: false; canceled: true }>;
  vaultChatSend?: (req: VaultChatRequest) => Promise<VaultChatResponse>;
  vaultConsumptionChatSend?: (req: VaultConsumptionChatRequest) => Promise<VaultConsumptionChatResponse>;
  vaultApplyPlan?: (req: VaultApplyPlanRequest) => Promise<VaultApplyPlanResponse>;
  vaultPickReferenceFolder?: () => Promise<
    { ok: true; path: string } | { ok: false; canceled: true }
  >;
  vaultPickDirectory?: () => Promise<{ ok: true; path: string } | { ok: false; canceled: true }>;
  vaultInitialize?: (req: VaultInitializeRequest) => Promise<VaultInitializeResponse>;
  vaultAssignCategory?: (req: VaultAssignCategoryRequest) => Promise<VaultAssignCategoryResponse>;
  vaultListPaths?: (
    documentId: string,
  ) => Promise<{ diskPaths: string[]; files: Record<string, string>; vaultCategory?: VaultCategory }>;
  vaultReadFile?: (documentId: string, relativePath: string) => Promise<{ content: string }>;
  vaultScanReferenceFolder?: (folderPath: string) => Promise<VaultReferenceScanResult>;
  vaultSkillsList?: () => Promise<import("./vaultSkill").VaultSkill[]>;
  vaultSkillsSave?: (skill: import("./vaultSkill").VaultSkillInput) => Promise<import("./vaultSkill").VaultSkill>;
  vaultSkillsDelete?: (id: string) => Promise<void>;
  windowMinimize?: () => Promise<void>;
  windowToggleMaximize?: () => Promise<boolean>;
  windowClose?: () => Promise<void>;
  windowIsMaximized?: () => Promise<boolean>;
  subscribeWindowMaximized?: (listener: (maximized: boolean) => void) => () => void;
  /** Subscribe to incremental assistant text during `markdownChatSend` / `workspaceChatSend` when `streamId` is sent. */
  subscribeAiChatStream?: (listener: (payload: AiChatStreamPayload) => void) => () => void;
  aiListLocalOptions?: () => Promise<LocalAiOptions>;
  /** Cancel an in-flight local AI chat turn (kills agent/model subprocess for the session key). */
  aiChatCancel?: (sessionKey: string) => Promise<boolean>;
  /** Preload local Whisper model (first voice use may download ~40MB). */
  speechEnsureModel?: () => Promise<{ ok: true }>;
  /** Transcribe a PCM audio chunk captured in the renderer (Electron offline STT). */
  speechTranscribeChunk?: (req: {
    samples: ArrayBuffer;
    sampleRate: number;
    locale: "en" | "pt";
  }) => Promise<{ text: string }>;
  integrationsCheck?: (payload?: IntegrationId | "all") => Promise<IntegrationCheckResponse>;
  integrationsRunStart?: (id: IntegrationId) => Promise<IntegrationRunStartResponse>;
  dailyReportLoadTaxonomy?: () => Promise<import("./daily-report").DailyReportTaxonomy>;
  dailyReportSaveTaxonomy?: (
    taxonomy: import("./daily-report").DailyReportTaxonomy,
  ) => Promise<{ ok: true }>;
  dailyReportGetStorageRoot?: () => Promise<import("./daily-report").DailyReportStorageRootInfo>;
  dailyReportSetStorageRoot?: (
    storageRootPath: string | null,
  ) => Promise<import("./daily-report").DailyReportStorageRootInfo>;
  dailyReportPickStorageRoot?: () => Promise<
    | ({ ok: true } & import("./daily-report").DailyReportStorageRootInfo)
    | { ok: false; canceled: true }
  >;
  dailyReportListMonth?: (
    year: number,
    month: number,
  ) => Promise<import("./daily-report").DailyReportMonthDayIndex[]>;
  dailyReportLoad?: (date: string) => Promise<import("./daily-report").DailyReportDocument>;
  dailyReportSave?: (
    document: import("./daily-report").DailyReportDocument,
  ) => Promise<{ ok: true }>;
  dailyReportChatSend?: (
    req: import("./daily-report").DailyReportChatRequest,
  ) => Promise<import("./daily-report").DailyReportChatResponse>;
};

declare global {
  interface Window {
    electronApi?: ElectronApi;
  }
}

export {};
