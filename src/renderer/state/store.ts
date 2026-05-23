import { create } from "zustand";
import { applyPatch } from "@/lib/patchEngine";
import {
  removeUmlPreviewZoomByPrefix,
  removeUmlPreviewZoomKey,
  renameUmlPreviewZoomPaths,
  setUmlPreviewZoomInMap,
} from "@/lib/umlPreviewZoom";
import { ChatPersistenceService } from "@/persistence/services/chatPersistenceService";
import type {
  AppScreen,
  ChatConversationTab,
  ChatMessage,
  Commit,
  Conversation,
  ConversationKind,
  Patch,
  TechnicalTemplate,
  ThemeMode,
  UiLocale,
} from "@/types";
import type { LocalAiSelection } from "@/types/electron-api";

const chatPersistenceService = new ChatPersistenceService();

type EditorState = {
  screen: AppScreen;
  conversations: Record<string, Conversation>;
  activeConversationId: string;
  technicalTemplates: TechnicalTemplate[];
  /** Replace templates list (e.g. after API load or create). */
  setTechnicalTemplates: (templates: TechnicalTemplate[]) => void;
  /** Append a template returned from the API. */
  addTechnicalTemplate: (template: TechnicalTemplate) => void;
  theme: ThemeMode;
  locale: UiLocale;
  setLocale: (locale: UiLocale) => void;
  errorMessage: string | null;
  hydrateFromBackend: (payload: { conversations: Conversation[]; templates: TechnicalTemplate[] }) => void;
  createConversation: (options: { kind: ConversationKind; templateId?: string }) => void;
  goHome: () => void;
  setActiveConversation: (id: string) => void;
  openConversationTab: () => void;
  closeConversationTab: (tabId: string) => void;
  setActiveConversationTab: (tabId: string) => void;
  renameConversationTab: (tabId: string, title: string) => void;
  loadConversationTab: (tabId: string) => Promise<void>;
  setTheme: (theme: ThemeMode) => void;
  setActiveFile: (file: string) => void;
  setFileContent: (file: string, content: string) => void;
  setPendingPatch: (patch: Patch | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  saveSnapshot: () => void;
  clearError: () => void;
  applyPendingPatch: (message?: string) => void;
  hasUnsavedChanges: (file: string) => boolean;
  addConversationFile: (file: string, content?: string) => void;
  removeConversationFile: (file: string) => void;
  /** Removes a file or every file under a directory prefix. */
  removeConversationPath: (path: string) => void;
  renameConversationPath: (fromPath: string, toPath: string) => void;
  mkdirConversationPath: (dirPath: string) => void;
  closeEditorTab: (file: string) => void;
  saveFileSnapshot: (file: string) => void;
  setUmlPreviewZoom: (file: string, zoom: number) => void;
  /** Persist AI selection on the active chat tab of the active conversation. */
  setActiveChatAiSelection: (selection: LocalAiSelection | undefined) => void;
};

const umlFiles: Record<string, string> = {
  "diagrams/auth-flow.puml":
    "@startuml\nactor User\nUser -> API: Authenticate\nAPI --> User: Token\n@enduml\n",
};

const technicalDocumentDefaultFiles: Record<string, string> = {
  "main.tex": "\\section{Introduction}\nWrite your technical document here.\n",
};

const nowIso = () => new Date().toISOString();
const LOCALE_STORAGE_KEY = "rag-talks-ui-locale";

const readStoredLocale = (): UiLocale => {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw === "pt" || raw === "en") return raw;
  } catch {
    /* ignore */
  }
  return "en";
};

const isPatch = (value: unknown): value is Patch => {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Patch;
  return typeof maybe.file === "string" && Array.isArray(maybe.changes);
};

const normalizeOpenEditorTabs = (c: {
  files: Record<string, string>;
  activeFile: string;
  openEditorTabs?: string[];
}): string[] => {
  const keys = new Set(Object.keys(c.files));
  const filtered = (c.openEditorTabs ?? []).filter((f) => keys.has(f));
  if (filtered.length > 0) return filtered;
  if (keys.has(c.activeFile)) return [c.activeFile];
  const sorted = [...keys].sort();
  return sorted[0] ? [sorted[0]] : [];
};

const normalizeConversationTabs = (conversation: Conversation): Conversation => {
  const mappedTabs = (conversation.chatTabs ?? [])
    .filter((tab) => typeof tab.id === "string" && tab.id.length > 0)
    .map((tab, index) => ({
      id: tab.id,
      title: tab.title?.trim() || `Chat ${index + 1}`,
      messages: tab.messages ?? [],
      aiSelection: tab.aiSelection,
    }));
  const tabs: ChatConversationTab[] =
    mappedTabs.length > 0
      ? mappedTabs
      : [
          {
            id: crypto.randomUUID(),
            title: "Chat 1",
            messages: conversation.chatMessages ?? [],
          },
        ];
  const activeTab = tabs.find((tab) => tab.id === conversation.activeChatTabId) ?? tabs[0];
  return {
    ...conversation,
    chatTabs: tabs,
    activeChatTabId: activeTab.id,
    chatMessages: activeTab.messages,
    loadedChatTabIds: conversation.loadedChatTabIds ?? [],
  };
};

const CHAT_TAB_CACHE_LIMIT = 5;

const createConversation = (
  title: string,
  templates: TechnicalTemplate[],
  options: { kind: ConversationKind; templateId?: string },
): Conversation | null => {
  if (options.kind === "uml") {
    const active = "diagrams/auth-flow.puml";
    const firstChatTabId = crypto.randomUUID();
    return {
      id: crypto.randomUUID(),
      title,
      kind: "uml",
      templateId: null,
      files: { ...umlFiles },
      activeFile: active,
      openEditorTabs: [active],
      pendingPatch: null,
      history: [],
      chatTabs: [{ id: firstChatTabId, title: "Chat 1", messages: [] }],
      activeChatTabId: firstChatTabId,
      chatMessages: [],
      loadedChatTabIds: [firstChatTabId],
      savedSnapshot: { ...umlFiles },
    };
  }

  const selectedTemplate = templates.find((item) => item.id === options.templateId);
  if (!selectedTemplate) {
    const files = { ...technicalDocumentDefaultFiles };
    const firstChatTabId = crypto.randomUUID();
    return {
      id: crypto.randomUUID(),
      title,
      kind: "technical_document",
      templateId: null,
      files,
      activeFile: "main.tex",
      openEditorTabs: ["main.tex"],
      pendingPatch: null,
      history: [],
      chatTabs: [{ id: firstChatTabId, title: "Chat 1", messages: [] }],
      activeChatTabId: firstChatTabId,
      chatMessages: [],
      loadedChatTabIds: [firstChatTabId],
      savedSnapshot: { ...files },
    };
  }

  const files = { ...selectedTemplate.files };
  const firstChatTabId = crypto.randomUUID();
  return {
    id: crypto.randomUUID(),
    title,
    kind: "technical_document",
    templateId: selectedTemplate.id,
    files,
    activeFile: "main.tex",
    openEditorTabs: ["main.tex"],
    pendingPatch: null,
    history: [],
    chatTabs: [{ id: firstChatTabId, title: "Chat 1", messages: [] }],
    activeChatTabId: firstChatTabId,
    chatMessages: [],
    loadedChatTabIds: [firstChatTabId],
    savedSnapshot: { ...files },
  };
};

export const useEditorStore = create<EditorState>((set, get) => ({
  screen: "home",
  conversations: {},
  activeConversationId: "",
  technicalTemplates: [],
  setTechnicalTemplates: (templates) => set({ technicalTemplates: templates }),
  addTechnicalTemplate: (template) =>
    set((state) => ({
      technicalTemplates: [...state.technicalTemplates, template],
    })),
  theme: "light",
  locale: readStoredLocale(),
  setLocale: (locale) => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
    set({ locale });
  },
  errorMessage: null,

  hydrateFromBackend: ({ conversations: list, templates }) =>
    set(() => {
      const conversations: Record<string, Conversation> = {};
      for (const c of list) {
        conversations[c.id] = normalizeConversationTabs({
          ...c,
          openEditorTabs: normalizeOpenEditorTabs(c),
        });
      }
      const hasConversations = list.length > 0;
      return {
        technicalTemplates: templates,
        conversations,
        activeConversationId: hasConversations ? list[0].id : "",
        screen: hasConversations ? "workspace" : "home",
      };
    }),

  createConversation: (options) =>
    set((state) => {
      const count = Object.keys(state.conversations).length + 1;
      const titleBase = options.kind === "uml" ? "UML Diagram" : "Technical Document";
      const conversation = createConversation(`${titleBase} ${count}`, state.technicalTemplates, options);
      if (!conversation) {
        return {
          errorMessage: "Invalid technical template selected.",
        };
      }
      return {
        conversations: {
          ...state.conversations,
          [conversation.id]: normalizeConversationTabs({
            ...conversation,
            activeChatTabId: conversation.chatTabs[0]?.id ?? "",
          }),
        },
        activeConversationId: conversation.id,
        screen: "workspace",
      };
    }),

  goHome: () => set({ screen: "home" }),

  setActiveConversation: (id) => {
    if (!id) return;
    set((state) => {
      const current = state.conversations[id];
      if (!current) return {};
      return {
        activeConversationId: id,
        screen: "workspace",
        conversations: {
          ...state.conversations,
          [id]: normalizeConversationTabs(current),
        },
      };
    });
  },

  openConversationTab: () =>
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current) return {};
      const normalized = normalizeConversationTabs(current);
      const nextTabs = [
        ...normalized.chatTabs,
        {
          id: crypto.randomUUID(),
          title: `Chat ${normalized.chatTabs.length + 1}`,
          messages: [],
        },
      ];
      const nextActiveTab = nextTabs[nextTabs.length - 1];
      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...normalized,
            chatTabs: nextTabs,
            activeChatTabId: nextActiveTab.id,
            chatMessages: nextActiveTab.messages,
            loadedChatTabIds: [...(normalized.loadedChatTabIds ?? []), nextActiveTab.id],
          },
        },
      };
    }),

  closeConversationTab: (tabId) =>
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current) return {};
      const normalized = normalizeConversationTabs(current);
      if (!normalized.chatTabs.some((tab) => tab.id === tabId)) return {};
      const filtered = normalized.chatTabs.filter((tab) => tab.id !== tabId);
      const nextTabs =
        filtered.length > 0
          ? filtered
          : [
              {
                id: crypto.randomUUID(),
                title: "Chat 1",
                messages: [],
              },
            ];
      const previousIndex = normalized.chatTabs.findIndex((tab) => tab.id === tabId);
      const fallbackIndex = Math.max(0, Math.min(previousIndex - 1, nextTabs.length - 1));
      const nextActive =
        normalized.activeChatTabId === tabId
          ? nextTabs[fallbackIndex] ?? nextTabs[0]
          : nextTabs.find((tab) => tab.id === normalized.activeChatTabId) ?? nextTabs[0];
      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...normalized,
            chatTabs: nextTabs,
            activeChatTabId: nextActive.id,
            chatMessages: nextActive.messages,
            loadedChatTabIds: (normalized.loadedChatTabIds ?? []).filter((loadedId) =>
              nextTabs.some((tab) => tab.id === loadedId),
            ),
          },
        },
      };
    }),

  setActiveConversationTab: (tabId) =>
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current) return {};
      const normalized = normalizeConversationTabs(current);
      const nextActive = normalized.chatTabs.find((tab) => tab.id === tabId);
      if (!nextActive) return {};
      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...normalized,
            activeChatTabId: nextActive.id,
            chatMessages: nextActive.messages,
            loadedChatTabIds: [...(normalized.loadedChatTabIds ?? []).filter((loadedId) => loadedId !== nextActive.id), nextActive.id],
          },
        },
      };
    }),

  loadConversationTab: async (tabId) => {
    const state = get();
    const documentId = state.activeConversationId;
    const current = state.conversations[documentId];
    if (!current) return;
    const normalized = normalizeConversationTabs(current);
    const target = normalized.chatTabs.find((tab) => tab.id === tabId);
    if (!target) return;
    const alreadyLoaded = normalized.loadedChatTabIds?.includes(tabId) ?? false;
    if (alreadyLoaded || typeof window === "undefined") return;

    const detail = await chatPersistenceService.loadChat(documentId, tabId);

    set((nextState) => {
      const doc = nextState.conversations[documentId];
      if (!doc) return {};
      const docNormalized = normalizeConversationTabs(doc);
      const tabIndex = docNormalized.chatTabs.findIndex((tab) => tab.id === tabId);
      if (tabIndex < 0) return {};
      const nextTabs = [...docNormalized.chatTabs];
      nextTabs[tabIndex] = {
        ...nextTabs[tabIndex],
        messages: Array.isArray(detail?.messages) ? detail.messages : [],
      };
      const loadedOrder = [...(docNormalized.loadedChatTabIds ?? []).filter((id) => id !== tabId), tabId];
      const evictCandidates = [...loadedOrder];
      while (evictCandidates.length > CHAT_TAB_CACHE_LIMIT) {
        const evictId = evictCandidates.shift();
        if (!evictId || evictId === docNormalized.activeChatTabId) continue;
        const evictIndex = nextTabs.findIndex((tab) => tab.id === evictId);
        if (evictIndex >= 0) nextTabs[evictIndex] = { ...nextTabs[evictIndex], messages: [] };
      }
      const history = Array.isArray(detail?.history) && docNormalized.activeChatTabId === tabId ? detail.history : docNormalized.history;
      const chatMessages = docNormalized.activeChatTabId === tabId ? nextTabs[tabIndex].messages : docNormalized.chatMessages;
      return {
        conversations: {
          ...nextState.conversations,
          [documentId]: {
            ...docNormalized,
            chatTabs: nextTabs,
            loadedChatTabIds: evictCandidates,
            history,
            chatMessages,
          },
        },
      };
    });
  },

  renameConversationTab: (tabId, title) =>
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current) return {};
      const normalized = normalizeConversationTabs(current);
      const trimmed = title.trim();
      if (!trimmed) return {};
      const tabIndex = normalized.chatTabs.findIndex((tab) => tab.id === tabId);
      if (tabIndex < 0) return {};
      const nextTabs = [...normalized.chatTabs];
      nextTabs[tabIndex] = { ...nextTabs[tabIndex], title: trimmed };
      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...normalized,
            chatTabs: nextTabs,
          },
        },
      };
    }),

  setTheme: (theme) => set({ theme }),

  setActiveFile: (file) =>
    set((state) => {
      const current = state.conversations[state.activeConversationId];
      if (!current || !Object.hasOwn(current.files, file)) return {};
      const tabs = normalizeOpenEditorTabs(current);
      const nextTabs = tabs.includes(file) ? tabs : [...tabs, file];
      return {
        conversations: {
          ...state.conversations,
          [current.id]: { ...current, activeFile: file, openEditorTabs: nextTabs },
        },
      };
    }),

  closeEditorTab: (file) =>
    set((state) => {
      const current = state.conversations[state.activeConversationId];
      if (!current) return {};
      const tabs = normalizeOpenEditorTabs(current).filter((f) => f !== file);
      const keys = Object.keys(current.files);
      let nextTabs = tabs;
      if (nextTabs.length === 0 && keys.length > 0) {
        nextTabs = [keys.sort()[0]!];
      }
      const oldTabs = normalizeOpenEditorTabs(current);
      const idx = oldTabs.indexOf(file);
      let nextActive = current.activeFile;
      if (current.activeFile === file) {
        nextActive =
          oldTabs[idx - 1] ?? oldTabs[idx + 1] ?? nextTabs[0] ?? current.activeFile;
      }
      if (!Object.hasOwn(current.files, nextActive)) {
        nextActive = nextTabs[0] ?? keys.sort()[0] ?? current.activeFile;
      }
      return {
        conversations: {
          ...state.conversations,
          [current.id]: {
            ...current,
            openEditorTabs: nextTabs,
            activeFile: nextActive,
          },
        },
      };
    }),

  saveFileSnapshot: (file) =>
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current || !Object.hasOwn(current.files, file)) return {};
      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...current,
            savedSnapshot: {
              ...current.savedSnapshot,
              [file]: current.files[file],
            },
          },
        },
      };
    }),

  setUmlPreviewZoom: (file, zoom) =>
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current || !Object.hasOwn(current.files, file)) return {};
      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...current,
            umlPreviewZoom: setUmlPreviewZoomInMap(current.umlPreviewZoom, file, zoom),
          },
        },
      };
    }),

  setFileContent: (file, content) =>
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current) return {};
      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...current,
            files: {
              ...current.files,
              [file]: content,
            },
          },
        },
      };
    }),

  setPendingPatch: (patch) => {
    if (patch !== null && !isPatch(patch)) {
      throw new Error("Invalid patch payload");
    }
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current) return {};
      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...current,
            pendingPatch: patch,
          },
        },
      };
    });
  },

  addChatMessage: (message) =>
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current) return {};
      const normalized = normalizeConversationTabs(current);
      const tabIndex = normalized.chatTabs.findIndex((tab) => tab.id === normalized.activeChatTabId);
      if (tabIndex < 0) return {};
      const currentTab = normalized.chatTabs[tabIndex];
      const updatedTab = {
        ...currentTab,
        messages: [...currentTab.messages, message],
      };
      const nextTabs = [...normalized.chatTabs];
      nextTabs[tabIndex] = updatedTab;
      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...normalized,
            chatTabs: nextTabs,
            chatMessages: updatedTab.messages,
            loadedChatTabIds: [
              ...(normalized.loadedChatTabIds ?? []).filter((loadedId) => loadedId !== updatedTab.id),
              updatedTab.id,
            ],
          },
        },
      };
    }),

  saveSnapshot: () =>
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current) return {};
      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...current,
            savedSnapshot: { ...current.files },
          },
        },
      };
    }),

  clearError: () => set({ errorMessage: null }),

  applyPendingPatch: (message = "Apply AI patch") => {
    const { conversations, activeConversationId } = get();
    const conversation = conversations[activeConversationId];

    if (!conversation?.pendingPatch) return;
    if (!Object.hasOwn(conversation.files, conversation.pendingPatch.file)) {
      set({ errorMessage: `Target file not found: ${conversation.pendingPatch.file}` });
      return;
    }

    try {
      const nextContent = applyPatch(
        conversation.files[conversation.pendingPatch.file],
        conversation.pendingPatch,
      );
      const commit: Commit = {
        id: crypto.randomUUID(),
        message,
        patch: conversation.pendingPatch,
        timestamp: nowIso(),
        author: "ai",
      };

      set({
        conversations: {
          ...conversations,
          [activeConversationId]: {
            ...conversation,
            files: {
              ...conversation.files,
              [conversation.pendingPatch.file]: nextContent,
            },
            history: [...conversation.history, commit],
            pendingPatch: null,
          },
        },
        errorMessage: null,
      });
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : "Patch apply failed",
      });
    }
  },

  hasUnsavedChanges: (file) => {
    const state = get();
    const conversation = state.conversations[state.activeConversationId];
    if (!conversation) return false;
    return conversation.savedSnapshot[file] !== conversation.files[file];
  },

  addConversationFile: (file, content = "") =>
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current) return {};
      if (Object.hasOwn(current.files, file)) return {};
      const trimmed = file.trim();
      let initial = content;
      if (!initial && trimmed.endsWith(".tex")) {
        initial = "\\section{Section}\n";
      }
      const nextFiles = { ...current.files, [trimmed]: initial };
      const nextSnapshot = { ...current.savedSnapshot, [trimmed]: initial };
      const tabBase = normalizeOpenEditorTabs(current);
      const nextTabs = tabBase.includes(trimmed) ? tabBase : [...tabBase, trimmed];
      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...current,
            files: nextFiles,
            activeFile: trimmed,
            savedSnapshot: nextSnapshot,
            openEditorTabs: nextTabs,
          },
        },
      };
    }),

  removeConversationFile: (file) =>
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current || !Object.hasOwn(current.files, file)) return {};
      const rest = { ...current.files };
      delete rest[file];
      const snapRest = { ...current.savedSnapshot };
      delete snapRest[file];
      const keys = Object.keys(rest);
      const nextActive =
        current.activeFile === file ? (keys[0] ?? "main.tex") : current.activeFile;
      let nextTabs = normalizeOpenEditorTabs(current).filter((f) => f !== file);
      if (nextTabs.length === 0 && keys.length > 0) {
        nextTabs = [keys.sort()[0]!];
      }
      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...current,
            files: rest,
            savedSnapshot: snapRest,
            umlPreviewZoom: removeUmlPreviewZoomKey(current.umlPreviewZoom, file),
            activeFile: nextActive,
            openEditorTabs: nextTabs,
            pendingPatch:
              current.pendingPatch?.file === file ? null : current.pendingPatch,
          },
        },
      };
    }),

  removeConversationPath: (path) =>
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current) return {};
      const norm = path.replace(/\\/g, "/").replace(/\/+$/, "").trim();
      if (!norm) return {};

      const matches = (key: string) => key === norm || key.startsWith(`${norm}/`);

      const nextFiles: Record<string, string> = {};
      for (const [k, v] of Object.entries(current.files)) {
        if (!matches(k)) nextFiles[k] = v;
      }
      const nextSnapshot: Record<string, string> = {};
      for (const [k, v] of Object.entries(current.savedSnapshot)) {
        if (!matches(k)) nextSnapshot[k] = v;
      }

      const keys = Object.keys(nextFiles);
      const activeRemoved = matches(current.activeFile);
      const nextActive = activeRemoved ? (keys[0] ?? "main.tex") : current.activeFile;

      let nextTabs = normalizeOpenEditorTabs(current).filter((f) => !matches(f));
      if (nextTabs.length === 0 && keys.length > 0) {
        nextTabs = [keys.sort()[0]!];
      }

      let nextPatch = current.pendingPatch;
      if (nextPatch && matches(nextPatch.file)) {
        nextPatch = null;
      }

      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...current,
            files: nextFiles,
            savedSnapshot: nextSnapshot,
            umlPreviewZoom: removeUmlPreviewZoomByPrefix(current.umlPreviewZoom, norm),
            activeFile: nextActive,
            openEditorTabs: nextTabs,
            pendingPatch: nextPatch,
          },
        },
      };
    }),

  renameConversationPath: (fromPath, toPath) =>
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current) return {};
      const from = fromPath.trim();
      const to = toPath.trim();
      if (!from || !to || from === to) return {};

      const isDirPrefix = (key: string) => key === from || key.startsWith(`${from}/`);

      const nextFiles: Record<string, string> = {};
      const nextSnapshot: Record<string, string> = {};

      for (const [k, v] of Object.entries(current.files)) {
        if (isDirPrefix(k)) {
          const suffix = k === from ? "" : k.slice(from.length + 1);
          const newKey = suffix ? `${to}/${suffix}` : to;
          nextFiles[newKey] = v;
        } else {
          nextFiles[k] = v;
        }
      }
      for (const [k, v] of Object.entries(current.savedSnapshot)) {
        if (isDirPrefix(k)) {
          const suffix = k === from ? "" : k.slice(from.length + 1);
          const newKey = suffix ? `${to}/${suffix}` : to;
          nextSnapshot[newKey] = v;
        } else {
          nextSnapshot[k] = v;
        }
      }

      let nextActive = current.activeFile;
      if (isDirPrefix(current.activeFile)) {
        const suf =
          current.activeFile === from ? "" : current.activeFile.slice(from.length + 1);
        nextActive = suf ? `${to}/${suf}` : to;
      }

      const mapTabPath = (tabPath: string): string => {
        if (!isDirPrefix(tabPath)) return tabPath;
        const suf = tabPath === from ? "" : tabPath.slice(from.length + 1);
        return suf ? `${to}/${suf}` : to;
      };
      const nextOpenTabs = normalizeOpenEditorTabs(current).map(mapTabPath);

      let nextPatch = current.pendingPatch;
      if (nextPatch && isDirPrefix(nextPatch.file)) {
        const suf = nextPatch.file === from ? "" : nextPatch.file.slice(from.length + 1);
        nextPatch = { ...nextPatch, file: suf ? `${to}/${suf}` : to };
      }

      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...current,
            files: nextFiles,
            savedSnapshot: nextSnapshot,
            umlPreviewZoom: renameUmlPreviewZoomPaths(current.umlPreviewZoom, from, to),
            activeFile: nextActive,
            openEditorTabs: normalizeOpenEditorTabs({
              files: nextFiles,
              activeFile: nextActive,
              openEditorTabs: nextOpenTabs,
            }),
            pendingPatch: nextPatch,
          },
        },
      };
    }),

  mkdirConversationPath: (dirPath) =>
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current) return {};
      const dir = dirPath.replace(/\\/g, "/").replace(/\/+$/, "").trim();
      if (!dir) return {};
      const keepKey = `${dir}/.keep`;
      if (Object.hasOwn(current.files, keepKey)) return {};
      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...current,
            files: { ...current.files, [keepKey]: "" },
            savedSnapshot: { ...current.savedSnapshot, [keepKey]: "" },
          },
        },
      };
    }),

  setActiveChatAiSelection: (selection) =>
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current) return {};
      const normalized = normalizeConversationTabs(current);
      const tabIndex = normalized.chatTabs.findIndex((tab) => tab.id === normalized.activeChatTabId);
      if (tabIndex < 0) return {};
      const nextTabs = [...normalized.chatTabs];
      nextTabs[tabIndex] = { ...nextTabs[tabIndex], aiSelection: selection };
      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...normalized,
            chatTabs: nextTabs,
          },
        },
      };
    }),
}));
