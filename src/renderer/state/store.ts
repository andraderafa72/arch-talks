import { create } from "zustand";
import { requireVaultElectronApi } from "@/lib/electronBridge";
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
  VaultCategory,
  ThemeMode,
  UiLocale,
  VaultPlanProposal,
} from "@/types";
import type { UserPreferencesV1 } from "@/types/userPreferences";
import type { LocalAiSelection, VaultIngestionPlan } from "@/types/electron-api";
import { applyDocumentThemeFromId } from "@/lib/documentTheme";
import {
  DEFAULT_UI_THEME_ID,
  getThemeById,
  listThemes,
  normalizeUiThemeId,
} from "@/lib/themeRegistry";
import type { UiThemeV1 } from "@/types/uiTheme";
import { duplicateUiTheme as duplicateUiThemeFromSource, parseUiTheme, slugifyThemeId } from "@/types/uiTheme";
import { chatTabStreamKey } from "@/lib/chatTabStream";
import { buildVaultPlanProposal, getNextVaultProposalPath } from "@/lib/vaultPlanProposal";
import type { ChatTabStreamState } from "@/types";

const chatPersistenceService = new ChatPersistenceService();

async function persistChatTab(documentId: string, conversation: Conversation, tabId: string): Promise<void> {
  const normalized = normalizeConversationTabs(conversation);
  const tab = normalized.chatTabs.find((t) => t.id === tabId);
  if (!tab) return;
  try {
    await chatPersistenceService.saveChat(documentId, tabId, {
      chatId: tabId,
      messages: tab.messages,
      history: normalized.activeChatTabId === tabId ? normalized.history : [],
    });
  } catch (error) {
    console.error("[persistChatTab]", error);
  }
}

function vaultPathMatchesPrefix(key: string, root: string): boolean {
  return key === root || key.startsWith(`${root}/`);
}

function prunePendingVaultProposal(
  proposal: VaultPlanProposal | null | undefined,
  matches: (key: string) => boolean,
): VaultPlanProposal | null {
  if (!proposal) return null;
  const changes = proposal.changes.filter((c) => !matches(c.path));
  return changes.length > 0 ? { ...proposal, changes } : null;
}

function mapVaultPathRename(key: string, from: string, to: string): string {
  const isDirPrefix = (k: string) => k === from || k.startsWith(`${from}/`);
  if (!isDirPrefix(key)) return key;
  const suffix = key === from ? "" : key.slice(from.length + 1);
  return suffix ? `${to}/${suffix}` : to;
}

function scheduleVaultRenameOnDisk(
  get: () => EditorState,
  set: (fn: (state: EditorState) => Partial<EditorState>) => void,
  documentId: string,
  fromPath: string,
  toPath: string,
): void {
  const from = fromPath.trim();
  const to = toPath.trim();
  if (!from || !to || from === to) return;

  queueMicrotask(async () => {
    const api = typeof window !== "undefined" ? window.electronApi : undefined;
    if (!api?.readDocumentFiles || !api?.writeDocumentFiles) return;
    const live = get().conversations[documentId];
    if (!live || live.kind !== "vault" || !live.vaultRootPath) return;

    try {
      const diskFiles = await api.readDocumentFiles(documentId);
      const inMemory = live.files;
      const nextFiles: Record<string, string> = {};

      for (const [k, v] of Object.entries(diskFiles)) {
        const newKey = mapVaultPathRename(k, from, to);
        if (Object.hasOwn(inMemory, newKey)) {
          nextFiles[newKey] = inMemory[newKey];
        } else if (Object.hasOwn(inMemory, k)) {
          nextFiles[newKey] = inMemory[k];
        } else {
          nextFiles[newKey] = v;
        }
      }
      for (const [k, v] of Object.entries(inMemory)) {
        if (!Object.hasOwn(nextFiles, k)) {
          nextFiles[k] = v;
        }
      }

      await api.writeDocumentFiles(documentId, nextFiles);

      set((state) => {
        const current = state.conversations[documentId];
        if (!current || current.kind !== "vault") return {};
        const nextSnapshot: Record<string, string> = {};
        for (const [k, v] of Object.entries(current.savedSnapshot)) {
          const newKey = mapVaultPathRename(k, from, to);
          if (Object.hasOwn(nextFiles, newKey)) {
            nextSnapshot[newKey] = v;
          }
        }
        for (const [k, v] of Object.entries(nextFiles)) {
          if (!Object.hasOwn(nextSnapshot, k)) {
            nextSnapshot[k] = v;
          }
        }
        return {
          conversations: {
            ...state.conversations,
            [documentId]: {
              ...current,
              files: nextFiles,
              savedSnapshot: nextSnapshot,
            },
          },
          errorMessage: null,
        };
      });
      await get().refreshVaultDiskPaths();
    } catch (error) {
      set(() => ({
        errorMessage: error instanceof Error ? error.message : "Failed to rename vault files on disk",
      }));
    }
  });
}

function scheduleVaultDiskRefresh(get: () => EditorState, refresh: () => Promise<void>): void {
  queueMicrotask(() => {
    const current = get().conversations[get().activeConversationId];
    if (current?.kind === "vault" && current.vaultRootPath) {
      void refresh();
    }
  });
}

function scheduleVaultDeleteOnDisk(
  get: () => EditorState,
  set: (fn: (state: EditorState) => Partial<EditorState>) => void,
  documentId: string,
  removeRoots: string[],
): void {
  const matches = (key: string) => removeRoots.some((root) => vaultPathMatchesPrefix(key, root));
  queueMicrotask(async () => {
    const api = typeof window !== "undefined" ? window.electronApi : undefined;
    if (!api?.readDocumentFiles || !api?.writeDocumentFiles) return;
    const current = get().conversations[documentId];
    if (current?.kind !== "vault" || !current.vaultRootPath) return;
    try {
      const diskFiles = await api.readDocumentFiles(documentId);
      const nextFiles: Record<string, string> = {};
      for (const [k, v] of Object.entries(diskFiles)) {
        if (!matches(k)) nextFiles[k] = v;
      }
      await api.writeDocumentFiles(documentId, nextFiles);
      set((state) => {
        const live = state.conversations[documentId];
        if (!live || live.kind !== "vault") return {};
        const nextSnapshot: Record<string, string> = {};
        for (const [k, v] of Object.entries(live.savedSnapshot)) {
          if (!matches(k)) nextSnapshot[k] = v;
        }
        const keys = Object.keys(nextFiles);
        const activeRemoved = matches(live.activeFile);
        const nextActive = activeRemoved ? (keys[0] ?? "") : live.activeFile;
        let nextTabs = normalizeOpenEditorTabs(live).filter((f) => !matches(f));
        if (nextTabs.length === 0 && keys.length > 0) {
          nextTabs = [keys.sort()[0]!];
        }
        return {
          conversations: {
            ...state.conversations,
            [documentId]: {
              ...live,
              files: nextFiles,
              savedSnapshot: nextSnapshot,
              activeFile: nextActive,
              openEditorTabs: nextTabs,
              vaultDiskPaths: (live.vaultDiskPaths ?? []).filter((p) => !matches(p)),
              pendingVaultProposal: prunePendingVaultProposal(live.pendingVaultProposal, matches),
            },
          },
          errorMessage: null,
        };
      });
      await get().refreshVaultDiskPaths();
    } catch (error) {
      set(() => ({
        errorMessage: error instanceof Error ? error.message : "Failed to delete vault files on disk",
      }));
    }
  });
}

type EditorState = {
  screen: AppScreen;
  conversations: Record<string, Conversation>;
  /** Key: `chatTabStreamKey(documentId, tabId)` — preserves streaming UI across tab switches. */
  chatStreams: Record<string, ChatTabStreamState>;
  activeConversationId: string;
  technicalTemplates: TechnicalTemplate[];
  /** Replace templates list (e.g. after API load or create). */
  setTechnicalTemplates: (templates: TechnicalTemplate[]) => void;
  /** Append a template returned from the API. */
  addTechnicalTemplate: (template: TechnicalTemplate) => void;
  theme: ThemeMode;
  uiThemeId: string;
  customUiThemes: UiThemeV1[];
  locale: UiLocale;
  setLocale: (locale: UiLocale) => void;
  errorMessage: string | null;
  hydrateFromBackend: (payload: { conversations: Conversation[]; templates: TechnicalTemplate[] }) => void;
  createConversation: (options: { kind: ConversationKind; templateId?: string; vaultName?: string }) => void;
  completeVaultInitialization: (
    documentId: string,
    payload: {
      title: string;
      vaultName: string;
      vaultRootPath: string;
      vaultCategory: VaultCategory;
      files: Record<string, string>;
      diskPaths: string[];
      activeFile: string;
    },
  ) => void;
  assignVaultCategory: (documentId: string, category: VaultCategory) => Promise<void>;
  refreshVaultDiskPaths: () => Promise<void>;
  loadVaultFileContent: (file: string) => Promise<void>;
  goHome: () => void;
  setActiveConversation: (id: string) => void;
  openConversationTab: () => void;
  closeConversationTab: (tabId: string) => void;
  setActiveConversationTab: (tabId: string) => void;
  renameConversationTab: (tabId: string, title: string) => void;
  loadConversationTab: (tabId: string) => Promise<void>;
  setChatTabStream: (documentId: string, tabId: string, stream: ChatTabStreamState) => void;
  patchChatTabStreamText: (documentId: string, tabId: string, streamId: string, text: string) => void;
  clearChatTabStream: (documentId: string, tabId: string) => void;
  setTheme: (theme: ThemeMode) => void;
  setUiThemeId: (uiThemeId: string) => void;
  saveCustomUiTheme: (theme: UiThemeV1) => void;
  deleteCustomUiTheme: (id: string) => void;
  duplicateUiTheme: (sourceId: string, newName: string) => UiThemeV1 | null;
  applyUserPreferences: (
    preferences: Pick<UserPreferencesV1, "theme" | "locale" | "uiThemeId" | "customUiThemes">,
  ) => void;
  setActiveFile: (file: string) => void;
  setFileContent: (file: string, content: string) => void;
  setPendingPatch: (patch: Patch | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  addChatMessageToTab: (message: ChatMessage, tabId: string) => void;
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
  setPendingVaultProposal: (proposal: VaultPlanProposal | null) => void;
  /** Writes all proposed vault files to disk, then opens diff review. */
  stageVaultProposal: (proposal: VaultPlanProposal) => Promise<void>;
  setVaultReferenceFolder: (path: string | undefined, excerpt?: string) => void;
  keepVaultProposalFile: (path: string) => Promise<void>;
  discardVaultProposalFile: (path: string) => Promise<void>;
  keepAllVaultProposalFiles: () => Promise<void>;
  discardAllVaultProposalFiles: () => Promise<void>;
  undoLastVaultEdit: () => void;
};

const umlFiles: Record<string, string> = {
  "diagrams/auth-flow.puml":
    "@startuml\nactor User\nUser -> API: Authenticate\nAPI --> User: Token\n@enduml\n",
};

const technicalDocumentDefaultFiles: Record<string, string> = {
  "main.tex": "\\section{Introduction}\nWrite your technical document here.\n",
};

const vaultPlaceholderFiles: Record<string, string> = {};

const nowIso = () => new Date().toISOString();

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

function normalizeOpenChatTabIds(conversation: Pick<Conversation, "chatTabs" | "openChatTabIds">): string[] {
  const tabIds = conversation.chatTabs.map((t) => t.id);
  if (conversation.openChatTabIds === undefined) {
    return tabIds;
  }
  return conversation.openChatTabIds.filter((id) => tabIds.includes(id));
}

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
  const openChatTabIds = normalizeOpenChatTabIds({ ...conversation, chatTabs: tabs });
  return {
    ...conversation,
    chatTabs: tabs,
    openChatTabIds,
    activeChatTabId: activeTab.id,
    chatMessages: activeTab.messages,
    loadedChatTabIds: conversation.loadedChatTabIds ?? [],
  };
};

const createConversation = (
  title: string,
  templates: TechnicalTemplate[],
  options: { kind: ConversationKind; templateId?: string; vaultName?: string },
): Conversation | null => {
  const now = new Date().toISOString();
  const timestamps = { createdAt: now, updatedAt: now };

  if (options.kind === "uml") {
    const active = "diagrams/auth-flow.puml";
    const firstChatTabId = crypto.randomUUID();
    return {
      id: crypto.randomUUID(),
      title,
      kind: "uml",
      ...timestamps,
      templateId: null,
      files: { ...umlFiles },
      activeFile: active,
      openEditorTabs: [active],
      pendingPatch: null,
      history: [],
      chatTabs: [{ id: firstChatTabId, title: "Chat 1", messages: [] }],
      openChatTabIds: [firstChatTabId],
      activeChatTabId: firstChatTabId,
      chatMessages: [],
      loadedChatTabIds: [firstChatTabId],
      savedSnapshot: { ...umlFiles },
    };
  }

  if (options.kind === "vault") {
    const firstChatTabId = crypto.randomUUID();
    const displayTitle = options.vaultName?.trim() || title;
    return {
      id: crypto.randomUUID(),
      title: displayTitle,
      kind: "vault",
      ...timestamps,
      templateId: null,
      files: { ...vaultPlaceholderFiles },
      activeFile: "",
      openEditorTabs: [],
      pendingPatch: null,
      history: [],
      chatTabs: [{ id: firstChatTabId, title: "Chat 1", messages: [] }],
      openChatTabIds: [firstChatTabId],
      activeChatTabId: firstChatTabId,
      chatMessages: [],
      loadedChatTabIds: [firstChatTabId],
      savedSnapshot: {},
      pendingVaultProposal: null,
      lastAppliedVaultEdit: null,
      vaultName: options.vaultName?.trim(),
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
      ...timestamps,
      templateId: null,
      files,
      activeFile: "main.tex",
      openEditorTabs: ["main.tex"],
      pendingPatch: null,
      history: [],
      chatTabs: [{ id: firstChatTabId, title: "Chat 1", messages: [] }],
      openChatTabIds: [firstChatTabId],
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
    ...timestamps,
    templateId: selectedTemplate.id,
    files,
    activeFile: "main.tex",
    openEditorTabs: ["main.tex"],
    pendingPatch: null,
    history: [],
    chatTabs: [{ id: firstChatTabId, title: "Chat 1", messages: [] }],
    openChatTabIds: [firstChatTabId],
    activeChatTabId: firstChatTabId,
    chatMessages: [],
    loadedChatTabIds: [firstChatTabId],
    savedSnapshot: { ...files },
  };
};

export const useEditorStore = create<EditorState>((set, get) => ({
  screen: "home",
  conversations: {},
  chatStreams: {},
  activeConversationId: "",
  technicalTemplates: [],
  setTechnicalTemplates: (templates) => set({ technicalTemplates: templates }),
  addTechnicalTemplate: (template) =>
    set((state) => ({
      technicalTemplates: [...state.technicalTemplates, template],
    })),
  theme: "light",
  uiThemeId: DEFAULT_UI_THEME_ID,
  customUiThemes: [],
  locale: "en",
  applyUserPreferences: (preferences) => {
    const customUiThemes = preferences.customUiThemes ?? [];
    const uiThemeId = normalizeUiThemeId(preferences.uiThemeId, customUiThemes);
    const theme = preferences.theme;
    applyDocumentThemeFromId(theme, uiThemeId, customUiThemes);
    set({
      theme,
      uiThemeId,
      customUiThemes,
      locale: preferences.locale,
    });
  },
  setLocale: (locale) => set({ locale }),
  errorMessage: null,

  hydrateFromBackend: ({ conversations: list, templates }) =>
    set((state) => {
      const conversations: Record<string, Conversation> = {};
      for (const c of list) {
        conversations[c.id] = normalizeConversationTabs({
          ...c,
          openEditorTabs: normalizeOpenEditorTabs(c),
        });
      }
      const hasConversations = list.length > 0;
      const preferredId = state.activeConversationId;
      const restoredActiveId =
        preferredId && conversations[preferredId]
          ? preferredId
          : hasConversations
            ? list[0]!.id
            : "";
      return {
        technicalTemplates: templates,
        conversations,
        activeConversationId: restoredActiveId,
        screen: hasConversations ? "workspace" : "home",
      };
    }),

  createConversation: (options) =>
    set((state) => {
      const count = Object.keys(state.conversations).length + 1;
      const titleBase =
        options.kind === "uml"
          ? "UML Diagram"
          : options.kind === "vault"
            ? options.vaultName?.trim() || "Knowledge Vault"
            : "Technical Document";
      const conversation = createConversation(
        options.kind === "vault" ? titleBase : `${titleBase} ${count}`,
        state.technicalTemplates,
        options,
      );
      if (!conversation) {
        return {
          errorMessage:
            options.kind === "technical_document"
              ? "Invalid technical template selected."
              : "Could not create conversation.",
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
    const prev = get();
    const prevId = prev.activeConversationId;
    if (prevId && prevId !== id) {
      const prevConv = prev.conversations[prevId];
      if (prevConv) {
        const norm = normalizeConversationTabs(prevConv);
        void persistChatTab(prevId, norm, norm.activeChatTabId);
      }
    }
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
    const activeTabId = get().conversations[id]?.activeChatTabId;
    if (activeTabId) {
      void get().loadConversationTab(activeTabId);
    }
  },

  openConversationTab: () =>
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current) return {};
      const normalized = normalizeConversationTabs(current);
      const nextActiveTab = {
        id: crypto.randomUUID(),
        title: `Chat ${normalized.chatTabs.length + 1}`,
        messages: [] as ChatMessage[],
      };
      const nextTabs = [...normalized.chatTabs, nextActiveTab];
      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...normalized,
            chatTabs: nextTabs,
            openChatTabIds: [...(normalized.openChatTabIds ?? []), nextActiveTab.id],
            activeChatTabId: nextActiveTab.id,
            chatMessages: nextActiveTab.messages,
            loadedChatTabIds: [...(normalized.loadedChatTabIds ?? []), nextActiveTab.id],
          },
        },
      };
    }),

  closeConversationTab: (tabId) => {
    const id = get().activeConversationId;
    const current = get().conversations[id];
    if (!current) return;
    const normalized = normalizeConversationTabs(current);
    if (!normalized.chatTabs.some((tab) => tab.id === tabId)) return;

    void (async () => {
      await persistChatTab(id, normalized, tabId);

      set((state) => {
        const live = state.conversations[id];
        if (!live) return {};
        const norm = normalizeConversationTabs(live);
        if (!norm.chatTabs.some((tab) => tab.id === tabId)) return {};

        const currentOpen = norm.openChatTabIds ?? [];
        const nextOpen = currentOpen.filter((openId) => openId !== tabId);

        let nextActiveId = norm.activeChatTabId;
        if (norm.activeChatTabId === tabId && nextOpen.length > 0) {
          const previousIndex = currentOpen.indexOf(tabId);
          const fallbackIndex = Math.max(0, Math.min(previousIndex - 1, nextOpen.length - 1));
          nextActiveId = nextOpen[fallbackIndex] ?? nextOpen[0]!;
        }

        const nextActive = norm.chatTabs.find((tab) => tab.id === nextActiveId) ?? norm.chatTabs[0]!;

        return {
          conversations: {
            ...state.conversations,
            [id]: {
              ...norm,
              openChatTabIds: nextOpen,
              activeChatTabId: nextActive.id,
              chatMessages: nextActive.messages,
            },
          },
        };
      });
    })();
  },

  setActiveConversationTab: (tabId) => {
    const state = get();
    const id = state.activeConversationId;
    const current = state.conversations[id];
    if (!current) return;
    const normalized = normalizeConversationTabs(current);
    const nextActive = normalized.chatTabs.find((tab) => tab.id === tabId);
    if (!nextActive) return;
    if (normalized.activeChatTabId !== tabId) {
      void persistChatTab(id, normalized, normalized.activeChatTabId);
    }
    const nextOpenIds = (normalized.openChatTabIds ?? []).includes(tabId)
      ? (normalized.openChatTabIds ?? [])
      : [...(normalized.openChatTabIds ?? []), tabId];
    set({
      conversations: {
        ...state.conversations,
        [id]: {
          ...normalized,
          openChatTabIds: nextOpenIds,
          activeChatTabId: nextActive.id,
          chatMessages: nextActive.messages,
          loadedChatTabIds: [
            ...(normalized.loadedChatTabIds ?? []).filter((loadedId) => loadedId !== tabId),
            tabId,
          ],
        },
      },
    });
  },

  loadConversationTab: async (tabId) => {
    const state = get();
    const documentId = state.activeConversationId;
    const current = state.conversations[documentId];
    if (!current) return;
    const normalized = normalizeConversationTabs(current);
    const tabIndex = normalized.chatTabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex < 0) return;
    const target = normalized.chatTabs[tabIndex]!;
    const alreadyLoaded = normalized.loadedChatTabIds?.includes(tabId) ?? false;
    const needsDiskLoad = !alreadyLoaded || target.messages.length === 0;
    if (!needsDiskLoad || typeof window === "undefined") return;

    const detail = await chatPersistenceService.loadChat(documentId, tabId);

    set((nextState) => {
      const doc = nextState.conversations[documentId];
      if (!doc) return {};
      const docNormalized = normalizeConversationTabs(doc);
      const idx = docNormalized.chatTabs.findIndex((tab) => tab.id === tabId);
      if (idx < 0) return {};
      const nextTabs = [...docNormalized.chatTabs];
      nextTabs[idx] = {
        ...nextTabs[idx],
        messages: Array.isArray(detail?.messages) ? detail.messages : [],
      };
      const loadedOrder = [...(docNormalized.loadedChatTabIds ?? []).filter((loadedId) => loadedId !== tabId), tabId];
      const history =
        Array.isArray(detail?.history) && docNormalized.activeChatTabId === tabId
          ? detail.history
          : docNormalized.history;
      const chatMessages =
        docNormalized.activeChatTabId === tabId ? nextTabs[idx].messages : docNormalized.chatMessages;
      return {
        conversations: {
          ...nextState.conversations,
          [documentId]: {
            ...docNormalized,
            chatTabs: nextTabs,
            loadedChatTabIds: loadedOrder,
            history,
            chatMessages,
          },
        },
      };
    });
  },

  setChatTabStream: (documentId, tabId, stream) =>
    set((state) => ({
      chatStreams: {
        ...state.chatStreams,
        [chatTabStreamKey(documentId, tabId)]: stream,
      },
    })),

  patchChatTabStreamText: (documentId, tabId, streamId, text) =>
    set((state) => {
      const key = chatTabStreamKey(documentId, tabId);
      const current = state.chatStreams[key];
      if (!current || current.streamId !== streamId) return {};
      return {
        chatStreams: {
          ...state.chatStreams,
          [key]: { streamId, text },
        },
      };
    }),

  clearChatTabStream: (documentId, tabId) =>
    set((state) => {
      const key = chatTabStreamKey(documentId, tabId);
      if (!state.chatStreams[key]) return {};
      const next = { ...state.chatStreams };
      delete next[key];
      return { chatStreams: next };
    }),

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

  setTheme: (theme) => {
    const { uiThemeId, customUiThemes } = get();
    applyDocumentThemeFromId(theme, uiThemeId, customUiThemes);
    set({ theme });
  },

  setUiThemeId: (uiThemeId) => {
    const normalized = normalizeUiThemeId(uiThemeId, get().customUiThemes);
    const { theme, customUiThemes } = get();
    applyDocumentThemeFromId(theme, normalized, customUiThemes);
    set({ uiThemeId: normalized });
  },

  saveCustomUiTheme: (theme) => {
    const parsed = parseUiTheme({ ...theme, builtIn: false, version: 1 });
    if (!parsed.ok) return;
    const next = parsed.theme;
    set((state) => {
      const without = state.customUiThemes.filter((t) => t.id !== next.id);
      const customUiThemes = [...without, next];
      applyDocumentThemeFromId(state.theme, next.id, customUiThemes);
      return { customUiThemes, uiThemeId: next.id };
    });
  },

  deleteCustomUiTheme: (id) => {
    set((state) => {
      const customUiThemes = state.customUiThemes.filter((t) => t.id !== id);
      const uiThemeId =
        state.uiThemeId === id ? DEFAULT_UI_THEME_ID : normalizeUiThemeId(state.uiThemeId, customUiThemes);
      applyDocumentThemeFromId(state.theme, uiThemeId, customUiThemes);
      return { customUiThemes, uiThemeId };
    });
  },

  duplicateUiTheme: (sourceId, newName) => {
    const source = getThemeById(sourceId, get().customUiThemes);
    const baseId = slugifyThemeId(newName);
    let newId = baseId;
    let n = 1;
    const existing = new Set(listThemes(get().customUiThemes).map((t) => t.id));
    while (existing.has(newId)) {
      newId = `${baseId}-${n++}`;
    }
    const duplicate = duplicateUiThemeFromSource(source, newId, newName);
    get().saveCustomUiTheme(duplicate);
    return duplicate;
  },

  setActiveFile: (file) =>
    set((state) => {
      const current = state.conversations[state.activeConversationId];
      if (!current) return {};
      const canSelect =
        Object.hasOwn(current.files, file) ||
        (current.kind === "vault" && (current.vaultDiskPaths?.includes(file) ?? false));
      if (!canSelect) return {};
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

  addChatMessage: (message) => {
    const tabId = get().conversations[get().activeConversationId]?.activeChatTabId;
    if (!tabId) return;
    get().addChatMessageToTab(message, tabId);
  },

  addChatMessageToTab: (message, tabId) => {
    const id = get().activeConversationId;
    const current = get().conversations[id];
    if (!current) return;
    const normalized = normalizeConversationTabs(current);
    const tabIndex = normalized.chatTabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex < 0) return;
    const currentTab = normalized.chatTabs[tabIndex];
    const last = currentTab.messages[currentTab.messages.length - 1];
    if (
      last &&
      last.role === message.role &&
      last.content === message.content &&
      message.role !== "user"
    ) {
      return;
    }
    const updatedTab = {
      ...currentTab,
      messages: [...currentTab.messages, message],
    };
    const nextTabs = [...normalized.chatTabs];
    nextTabs[tabIndex] = updatedTab;
    set({
      conversations: {
        ...get().conversations,
        [id]: {
          ...normalized,
          chatTabs: nextTabs,
          chatMessages:
            normalized.activeChatTabId === tabId ? updatedTab.messages : normalized.chatMessages,
          loadedChatTabIds: [
            ...(normalized.loadedChatTabIds ?? []).filter((loadedId) => loadedId !== tabId),
            tabId,
          ],
        },
      },
    });
    void persistChatTab(id, get().conversations[id]!, tabId);
  },

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

  addConversationFile: (file, content = "") => {
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
      if (!initial && trimmed.endsWith(".md")) {
        initial = `# ${trimmed.split("/").pop()?.replace(/\.md$/i, "") ?? "Note"}\n`;
      }
      const nextFiles = { ...current.files, [trimmed]: initial };
      const nextSnapshot = { ...current.savedSnapshot, [trimmed]: initial };
      const tabBase = normalizeOpenEditorTabs(current);
      const nextTabs = tabBase.includes(trimmed) ? tabBase : [...tabBase, trimmed];
      const nextDiskPaths =
        current.kind === "vault"
          ? [...new Set([...(current.vaultDiskPaths ?? []), trimmed])].sort()
          : current.vaultDiskPaths;
      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...current,
            files: nextFiles,
            activeFile: trimmed,
            savedSnapshot: nextSnapshot,
            openEditorTabs: nextTabs,
            vaultDiskPaths: nextDiskPaths,
          },
        },
      };
    });
    scheduleVaultDiskRefresh(get, () => get().refreshVaultDiskPaths());
  },

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

  removeConversationPath: (path) => {
    const norm = path.replace(/\\/g, "/").replace(/\/+$/, "").trim();
    if (!norm) return;

    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current) return {};

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

      const nextDiskPaths =
        current.kind === "vault"
          ? (current.vaultDiskPaths ?? []).filter((p) => !matches(p))
          : current.vaultDiskPaths;

      const nextPendingVaultProposal = prunePendingVaultProposal(current.pendingVaultProposal, matches);

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
            vaultDiskPaths: nextDiskPaths,
            pendingVaultProposal: nextPendingVaultProposal,
          },
        },
      };
    });
    const vaultConv = get().conversations[get().activeConversationId];
    if (vaultConv?.kind === "vault" && vaultConv.vaultRootPath) {
      scheduleVaultDeleteOnDisk(get, set, vaultConv.id, [norm]);
    } else {
      scheduleVaultDiskRefresh(get, () => get().refreshVaultDiskPaths());
    }
  },

  renameConversationPath: (fromPath, toPath) => {
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

      const mapDiskPath = (p: string): string => {
        if (!isDirPrefix(p)) return p;
        const suf = p === from ? "" : p.slice(from.length + 1);
        return suf ? `${to}/${suf}` : to;
      };
      const nextDiskPaths =
        current.kind === "vault"
          ? [...new Set((current.vaultDiskPaths ?? []).map(mapDiskPath))].sort()
          : current.vaultDiskPaths;

      const mapProposalPath = (p: string): string => {
        if (!isDirPrefix(p)) return p;
        const suf = p === from ? "" : p.slice(from.length + 1);
        return suf ? `${to}/${suf}` : to;
      };
      let nextPendingVaultProposal = current.pendingVaultProposal;
      if (nextPendingVaultProposal) {
        const changes = nextPendingVaultProposal.changes.map((c) => ({
          ...c,
          path: mapProposalPath(c.path),
        }));
        nextPendingVaultProposal = changes.length > 0 ? { ...nextPendingVaultProposal, changes } : null;
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
            vaultDiskPaths: nextDiskPaths,
            pendingVaultProposal: nextPendingVaultProposal,
          },
        },
      };
    });

    const conv = get().conversations[get().activeConversationId];
    if (conv?.kind === "vault" && conv.vaultRootPath) {
      scheduleVaultRenameOnDisk(get, set, conv.id, fromPath, toPath);
    } else {
      queueMicrotask(async () => {
        const api = typeof window !== "undefined" ? window.electronApi : undefined;
        const current = get().conversations[get().activeConversationId];
        if (!current || !api?.writeDocumentFiles) return;
        try {
          await api.writeDocumentFiles(current.id, current.files);
        } catch (error) {
          set(() => ({
            errorMessage: error instanceof Error ? error.message : "Failed to rename files on disk",
          }));
        }
      });
    }
  },

  mkdirConversationPath: (dirPath) => {
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current) return {};
      const dir = dirPath.replace(/\\/g, "/").replace(/\/+$/, "").trim();
      if (!dir) return {};
      const keepKey = `${dir}/.keep`;
      if (Object.hasOwn(current.files, keepKey)) return {};
      const nextDiskPaths =
        current.kind === "vault"
          ? [...new Set([...(current.vaultDiskPaths ?? []), keepKey])].sort()
          : current.vaultDiskPaths;

      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...current,
            files: { ...current.files, [keepKey]: "" },
            savedSnapshot: { ...current.savedSnapshot, [keepKey]: "" },
            vaultDiskPaths: nextDiskPaths,
          },
        },
      };
    });
    scheduleVaultDiskRefresh(get, () => get().refreshVaultDiskPaths());
  },

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

  completeVaultInitialization: (documentId, payload) =>
    set((state) => {
      const current = state.conversations[documentId];
      if (!current || current.kind !== "vault") return {};
      const openTabs = payload.activeFile ? [payload.activeFile] : [];
      return {
        conversations: {
          ...state.conversations,
          [documentId]: {
            ...current,
            title: payload.title,
            vaultName: payload.vaultName,
            vaultRootPath: payload.vaultRootPath,
            vaultCategory: payload.vaultCategory,
            vaultDiskPaths: payload.diskPaths,
            files: payload.files,
            activeFile: payload.activeFile,
            openEditorTabs: openTabs,
            savedSnapshot: { ...payload.files },
          },
        },
      };
    }),

  assignVaultCategory: async (documentId, category) => {
    const api = requireVaultElectronApi();
    await api.vaultAssignCategory!({ documentId, category });
    set((state) => {
      const current = state.conversations[documentId];
      if (!current || current.kind !== "vault") return {};
      return {
        conversations: {
          ...state.conversations,
          [documentId]: {
            ...current,
            vaultCategory: category,
          },
        },
      };
    });
  },

  refreshVaultDiskPaths: async () => {
    const { activeConversationId, conversations } = get();
    const current = conversations[activeConversationId];
    if (!current || current.kind !== "vault" || !current.vaultRootPath) return;
    const api = typeof window !== "undefined" ? window.electronApi : undefined;
    if (!api?.vaultListPaths) return;
    try {
      const { diskPaths, files, vaultCategory } = await api.vaultListPaths(activeConversationId);
      set((state) => {
        const live = state.conversations[activeConversationId];
        if (!live || live.kind !== "vault") return {};
        return {
          conversations: {
            ...state.conversations,
            [activeConversationId]: {
              ...live,
              vaultDiskPaths: diskPaths,
              files: { ...files, ...live.files },
              ...(vaultCategory ? { vaultCategory } : {}),
            },
          },
        };
      });
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : "Failed to refresh vault files",
      });
    }
  },

  loadVaultFileContent: async (file) => {
    const { activeConversationId, conversations } = get();
    const current = conversations[activeConversationId];
    if (!current || current.kind !== "vault") return;
    if (Object.hasOwn(current.files, file)) return;
    const api = typeof window !== "undefined" ? window.electronApi : undefined;
    if (!api?.vaultReadFile) return;
    try {
      const { content } = await api.vaultReadFile(activeConversationId, file);
      set((state) => {
        const live = state.conversations[activeConversationId];
        if (!live) return {};
        return {
          conversations: {
            ...state.conversations,
            [activeConversationId]: {
              ...live,
              files: { ...live.files, [file]: content },
              savedSnapshot: { ...live.savedSnapshot, [file]: content },
            },
          },
        };
      });
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : "Failed to read vault file",
      });
    }
  },

  setPendingVaultProposal: (proposal) =>
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current || current.kind !== "vault") return {};
      const nextActive = proposal ? (getNextVaultProposalPath(proposal) ?? current.activeFile) : current.activeFile;
      const openTabs = proposal
        ? [...new Set([...normalizeOpenEditorTabs(current), ...proposal.changes.map((c) => c.path)])]
        : normalizeOpenEditorTabs(current);
      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...current,
            pendingVaultProposal: proposal,
            activeFile: nextActive,
            openEditorTabs: openTabs,
            pendingPatch: null,
          },
        },
      };
    }),

  stageVaultProposal: async (proposal) => {
    const id = get().activeConversationId;
    const current = get().conversations[id];
    if (!current || current.kind !== "vault") return;

    const api = typeof window !== "undefined" ? window.electronApi : undefined;
    if (!api?.vaultApplyPlan) {
      set({ errorMessage: "Vault apply is not available in this environment." });
      throw new Error("Vault apply is not available in this environment.");
    }

    if (proposal.changes.length === 0) {
      get().setPendingVaultProposal(proposal);
      return;
    }

    try {
      const result = await api.vaultApplyPlan({
        documentId: current.id,
        changes: proposal.changes.map((change) => ({
          path: change.path,
          content: change.proposedContent,
        })),
      });

      const nextActive = getNextVaultProposalPath(proposal) ?? current.activeFile;
      const openTabs = [
        ...new Set([...normalizeOpenEditorTabs(current), ...proposal.changes.map((c) => c.path)]),
      ];

      set({
        conversations: {
          ...get().conversations,
          [id]: {
            ...current,
            files: result.files,
            pendingVaultProposal: proposal,
            activeFile: nextActive,
            openEditorTabs: openTabs,
            pendingPatch: null,
          },
        },
        errorMessage: null,
      });
      scheduleVaultDiskRefresh(get, () => get().refreshVaultDiskPaths());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to write vault files to disk";
      set({ errorMessage: message });
      throw error;
    }
  },

  setVaultReferenceFolder: (path, excerpt) =>
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      if (!current || current.kind !== "vault") return {};
      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...current,
            referenceFolderPath: path,
            referenceExcerpt: excerpt,
          },
        },
      };
    }),

  keepVaultProposalFile: async (filePath) => {
    const { conversations, activeConversationId } = get();
    const conversation = conversations[activeConversationId];
    if (!conversation?.pendingVaultProposal) return;

    const change = conversation.pendingVaultProposal.changes.find((c) => c.path === filePath);
    if (!change) return;

    const remaining = conversation.pendingVaultProposal.changes.filter((c) => c.path !== filePath);
    const nextProposal = remaining.length > 0 ? { ...conversation.pendingVaultProposal, changes: remaining } : null;
    const nextActive = nextProposal ? (getNextVaultProposalPath(nextProposal) ?? conversation.activeFile) : filePath;

    set({
      conversations: {
        ...conversations,
        [activeConversationId]: {
          ...conversation,
          savedSnapshot: { ...conversation.savedSnapshot, [change.path]: change.proposedContent },
          pendingVaultProposal: nextProposal,
          activeFile: nextActive,
          ...(nextProposal === null
            ? {
                openEditorTabs: (() => {
                  const tabs = normalizeOpenEditorTabs(conversation).filter((tab) =>
                    Object.hasOwn(conversation.files, tab),
                  );
                  return tabs.length > 0 ? tabs : nextActive ? [nextActive] : [];
                })(),
              }
            : {}),
        },
      },
      errorMessage: null,
    });
  },

  keepAllVaultProposalFiles: async () => {
    const { conversations, activeConversationId } = get();
    const conversation = conversations[activeConversationId];
    if (!conversation?.pendingVaultProposal) return;

    const proposal = conversation.pendingVaultProposal;
    const nextSnapshot = { ...conversation.savedSnapshot };
    for (const change of proposal.changes) {
      nextSnapshot[change.path] = change.proposedContent;
    }

    const lastPath = proposal.changes[proposal.changes.length - 1]?.path ?? conversation.activeFile;
    const tabs = normalizeOpenEditorTabs(conversation).filter((tab) =>
      Object.hasOwn(conversation.files, tab),
    );

    set({
      conversations: {
        ...conversations,
        [activeConversationId]: {
          ...conversation,
          savedSnapshot: nextSnapshot,
          pendingVaultProposal: null,
          activeFile: lastPath || conversation.activeFile,
          openEditorTabs: tabs.length > 0 ? tabs : lastPath ? [lastPath] : [],
        },
      },
      errorMessage: null,
    });
  },

  discardAllVaultProposalFiles: async () => {
    const { conversations, activeConversationId } = get();
    const conversation = conversations[activeConversationId];
    if (!conversation?.pendingVaultProposal) return;

    const api = typeof window !== "undefined" ? window.electronApi : undefined;
    if (!api?.writeDocumentFiles) {
      set({ errorMessage: "Vault file write is not available in this environment." });
      return;
    }

    const proposal = conversation.pendingVaultProposal;
    const nextFiles = { ...conversation.files };
    for (const change of proposal.changes) {
      if (change.kind === "create") {
        delete nextFiles[change.path];
      } else {
        nextFiles[change.path] = change.originalContent;
      }
    }

    try {
      await api.writeDocumentFiles(conversation.id, nextFiles);

      set({
        conversations: {
          ...conversations,
          [activeConversationId]: {
            ...conversation,
            files: nextFiles,
            pendingVaultProposal: null,
          },
        },
        errorMessage: null,
      });
      scheduleVaultDiskRefresh(get, () => get().refreshVaultDiskPaths());
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : "Failed to revert vault changes on disk",
      });
    }
  },

  discardVaultProposalFile: async (filePath) => {
    const { conversations, activeConversationId } = get();
    const conversation = conversations[activeConversationId];
    if (!conversation?.pendingVaultProposal) return;

    const change = conversation.pendingVaultProposal.changes.find((c) => c.path === filePath);
    if (!change) return;

    const api = typeof window !== "undefined" ? window.electronApi : undefined;
    if (!api?.writeDocumentFiles) {
      set({ errorMessage: "Vault file write is not available in this environment." });
      return;
    }

    const nextFiles = { ...conversation.files };
    if (change.kind === "create") {
      delete nextFiles[filePath];
    } else {
      nextFiles[filePath] = change.originalContent;
    }

    try {
      await api.writeDocumentFiles(conversation.id, nextFiles);

      const remaining = conversation.pendingVaultProposal.changes.filter((c) => c.path !== filePath);
      const nextProposal =
        remaining.length > 0 ? { ...conversation.pendingVaultProposal, changes: remaining } : null;
      const nextActive =
        conversation.activeFile === filePath && nextProposal
          ? (getNextVaultProposalPath(nextProposal) ?? conversation.activeFile)
          : conversation.activeFile;

      set({
        conversations: {
          ...conversations,
          [activeConversationId]: {
            ...conversation,
            files: nextFiles,
            pendingVaultProposal: nextProposal,
            activeFile: nextActive,
          },
        },
        errorMessage: null,
      });
      scheduleVaultDiskRefresh(get, () => get().refreshVaultDiskPaths());
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : "Failed to revert vault change on disk",
      });
    }
  },

  undoLastVaultEdit: () =>
    set((state) => {
      const id = state.activeConversationId;
      const current = state.conversations[id];
      const edit = current?.lastAppliedVaultEdit;
      if (!current || !edit) return {};

      const nextFiles = { ...current.files };
      const nextSnapshot = { ...current.savedSnapshot };
      for (const path of edit.paths) {
        if (Object.hasOwn(edit.previousContents, path)) {
          nextFiles[path] = edit.previousContents[path];
          nextSnapshot[path] = edit.previousContents[path];
        } else {
          delete nextFiles[path];
          delete nextSnapshot[path];
        }
      }

      void (async () => {
        const api = typeof window !== "undefined" ? window.electronApi : undefined;
        if (api?.writeDocumentFiles) {
          await api.writeDocumentFiles(current.id, nextFiles);
        }
      })();

      return {
        conversations: {
          ...state.conversations,
          [id]: {
            ...current,
            files: nextFiles,
            savedSnapshot: nextSnapshot,
            lastAppliedVaultEdit: null,
          },
        },
      };
    }),
}));

export function setVaultPlanFromIngestion(
  plan: VaultIngestionPlan,
  existingFiles: Record<string, string>,
): VaultPlanProposal {
  return buildVaultPlanProposal(plan, existingFiles);
}
