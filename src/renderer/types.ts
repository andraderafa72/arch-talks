export type Patch = {
  file: string;
  changes: Change[];
};

export type Change =
  | { type: "insert_after"; anchor: string; content: string }
  | { type: "insert_before"; anchor: string; content: string }
  | { type: "replace_block"; target: string; content: string }
  | { type: "replace_all"; content: string };

export type Commit = {
  id: string;
  message: string;
  patch: Patch;
  timestamp: string;
  author: "user" | "ai";
};

/** A pending AI-proposed edit for the Markdown tool, ready for review in the diff editor. */
export type AiEditProposal = {
  id: string;
  file: string;
  originalContent: string;
  patch: Patch;
  proposedContent: string;
  timestamp: string;
};

/** A record of an AI edit that was applied, kept for single-level undo. */
export type AppliedAiEdit = {
  id: string;
  file: string;
  previousContent: string;
  appliedPatch: Patch;
  timestamp: string;
};

export type AppScreen = "home" | "workspace";

export type ConversationKind = "uml" | "technical_document";

export type TechnicalTemplate = {
  id: string;
  name: string;
  description: string;
  files: Record<string, string>;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
};

export type ChatConversationTab = {
  id: string;
  title: string;
  messages: ChatMessage[];
  /** Local AI provider/model selection, persisted per tab. */
  aiSelection?: import("./types/electron-api").LocalAiSelection;
};

export type ChatIndexItem = {
  id: string;
  title: string;
};

export type ChatDetail = {
  chatId: string;
  messages: ChatMessage[];
  history: Commit[];
};

export type ThemeMode = "light" | "dark";

/** UI language for labels (stored in localStorage). */
export type UiLocale = "en" | "pt";

export type Conversation = {
  id: string;
  title: string;
  kind: ConversationKind;
  templateId: string | null;
  files: Record<string, string>;
  activeFile: string;
  /** Files shown as tabs above the Monaco editor (subset of `files` keys). */
  openEditorTabs: string[];
  pendingPatch: Patch | null;
  history: Commit[];
  /** Conversation tabs shown inside the chat panel for this document. */
  chatTabs: ChatConversationTab[];
  activeChatTabId: string;
  /** Backward-compatible mirror of active chat tab messages. */
  chatMessages: ChatMessage[];
  /** Tabs currently loaded in-memory (for lazy load + LRU). */
  loadedChatTabIds?: string[];
  savedSnapshot: Record<string, string>;
};
