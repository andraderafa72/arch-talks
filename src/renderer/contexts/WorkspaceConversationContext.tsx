import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isMarkdownVaultPath } from "@/lib/vaultPaths";
import { ChatWorkspaceService } from "@/persistence/services/chatWorkspaceService";
import { useEditorStore } from "@/state/store";
import type {
  ChatConversationTab,
  ChatMessage,
  Conversation,
  Patch,
  VaultPlanFileChange,
  VaultPlanProposal,
} from "@/types";
import type { LocalAiSelection } from "@/types/electron-api";
import type { AiDiffReviewToolbar } from "@/components/editor/EditorPanel";

type WorkspaceConversationContextValue = {
  conversationList: Conversation[];
  activeConversationId: string;
  workspaceMissingConversation: boolean;
  openConversationTabs: ChatConversationTab[];
  allConversationTabs: ChatConversationTab[];
  activeConversationTabId: string;
  fileNames: string[];
  /** Files shown as tabs above the Monaco editor. */
  openEditorTabs: string[];
  activeFile: string;
  activeContent: string;
  pendingPatch: Patch | null;
  chatMessages: ChatMessage[];
  currentFiles: Record<string, string>;
  hasUnsavedChanges: (file: string) => boolean;
  selectFile: (file: string) => void;
  setPatch: (patch: Patch) => void;
  addMessage: (message: ChatMessage) => void;
  updateActiveFileContent: (next: string) => void;
  openConversation: (id: string) => void;
  openConversationTab: () => void;
  closeConversationTab: (tabId: string) => void;
  setActiveConversationTab: (tabId: string) => void;
  loadConversationTab: (tabId: string) => Promise<void>;
  renameConversationTab: (tabId: string, title: string) => void;
  addConversationFile: (file: string, content?: string) => void;
  removeConversationFile: (file: string) => void;
  removeConversationPath: (path: string) => void;
  renameConversationPath: (fromPath: string, toPath: string) => void;
  mkdirConversationPath: (dirPath: string) => void;
  closeEditorTab: (file: string) => void;
  saveActiveFile: () => void;
  saveRenderedPngToChat: (dataUrl: string) => void;
  openChatFolderInExplorer: () => void;
  activeChatAiSelection: LocalAiSelection | undefined;
  setActiveChatAiSelection: (selection: LocalAiSelection | undefined) => void;
  conversationKind: Conversation["kind"] | undefined;
  vaultFileTreeFilter: "markdown" | "all";
  setVaultFileTreeFilter: (filter: "markdown" | "all") => void;
  pendingVaultProposal: VaultPlanProposal | null;
  pendingVaultPaths: Set<string>;
  pendingReviewByPath: ReadonlyMap<string, "create" | "update">;
  vaultAiDiffReview: AiDiffReviewToolbar | null;
  vaultAppliedUndo: { onUndo: () => void } | null;
};

const WorkspaceConversationContext = createContext<WorkspaceConversationContextValue | null>(null);
const chatWorkspaceService = new ChatWorkspaceService();

type WorkspaceConversationProviderProps = {
  children: ReactNode;
  onOpenConversation: (id: string) => void;
};

export function WorkspaceConversationProvider({ children, onOpenConversation }: WorkspaceConversationProviderProps) {
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    openConversationTab,
    closeConversationTab,
    setActiveConversationTab,
    renameConversationTab,
    loadConversationTab,
    setActiveFile,
    setFileContent,
    setPendingPatch,
    addChatMessage,
    hasUnsavedChanges,
    addConversationFile,
    removeConversationFile,
    removeConversationPath,
    renameConversationPath,
    mkdirConversationPath,
    closeEditorTab,
    saveFileSnapshot,
    setActiveChatAiSelection,
    keepVaultProposalFile,
    discardVaultProposalFile,
    keepAllVaultProposalFiles,
    discardAllVaultProposalFiles,
    undoLastVaultEdit,
    refreshVaultDiskPaths,
    loadVaultFileContent,
  } = useEditorStore();

  const [vaultFileTreeFilter, setVaultFileTreeFilter] = useState<"markdown" | "all">("markdown");

  const currentConversation = conversations[activeConversationId];
  const pendingVaultProposal = currentConversation?.pendingVaultProposal ?? null;
  const pendingVaultPaths = useMemo(
    () => new Set(pendingVaultProposal?.changes.map((c) => c.path) ?? []),
    [pendingVaultProposal],
  );
  const pendingReviewByPath = useMemo(() => {
    const map = new Map<string, "create" | "update">();
    for (const change of pendingVaultProposal?.changes ?? []) {
      map.set(change.path, change.kind);
    }
    return map;
  }, [pendingVaultProposal]);
  useEffect(() => {
    if (currentConversation?.kind !== "vault" || !currentConversation.vaultRootPath) return;
    void refreshVaultDiskPaths();
  }, [currentConversation?.kind, currentConversation?.vaultRootPath, activeConversationId, refreshVaultDiskPaths]);

  useEffect(() => {
    setVaultFileTreeFilter("markdown");
  }, [activeConversationId]);

  const fileNames = useMemo(() => {
    if (!currentConversation) return [];
    const keys = new Set<string>();
    if (currentConversation.kind === "vault") {
      for (const path of currentConversation.vaultDiskPaths ?? []) keys.add(path);
    }
    for (const path of Object.keys(currentConversation.files)) keys.add(path);
    for (const path of pendingVaultPaths) keys.add(path);
    const sorted = [...keys].sort();
    if (currentConversation.kind === "vault" && vaultFileTreeFilter === "markdown") {
      return sorted.filter(isMarkdownVaultPath);
    }
    return sorted;
  }, [currentConversation, pendingVaultPaths, vaultFileTreeFilter]);

  const activeFile =
    currentConversation?.activeFile ??
    (currentConversation?.kind === "vault" ? "" : "main.tex");
  const openEditorTabs = useMemo(() => {
    if (!currentConversation?.openEditorTabs?.length) {
      return [activeFile];
    }
    const keys = new Set(Object.keys(currentConversation.files));
    const filtered = currentConversation.openEditorTabs.filter((f) => keys.has(f));
    return filtered.length > 0 ? filtered : [activeFile];
  }, [currentConversation, activeFile]);
  const activeContent = currentConversation?.files[activeFile] ?? "";
  const pendingPatch = currentConversation?.pendingPatch ?? null;
  const allConversationTabs = currentConversation?.chatTabs ?? [];
  const openChatTabIdSet = new Set(currentConversation?.openChatTabIds ?? []);
  const openConversationTabs = allConversationTabs.filter((tab) => openChatTabIdSet.has(tab.id));
  const activeConversationTabId = currentConversation?.activeChatTabId ?? "";
  const activeConversationTab =
    allConversationTabs.find((tab) => tab.id === activeConversationTabId) ?? allConversationTabs[0];
  const chatMessages = activeConversationTab?.messages ?? currentConversation?.chatMessages ?? [];
  const activeChatAiSelection = activeConversationTab?.aiSelection;
  const conversationList = useMemo(() => Object.values(conversations), [conversations]);

  const activeVaultChange: VaultPlanFileChange | undefined = pendingVaultProposal?.changes.find(
    (c) => c.path === activeFile,
  );

  const vaultPendingCount = pendingVaultProposal?.changes.length ?? 0;

  const vaultAiDiffReview: AiDiffReviewToolbar | null =
    activeVaultChange && pendingVaultProposal
      ? {
          proposalId: `${pendingVaultProposal.id}:${activeVaultChange.path}`,
          original: activeVaultChange.originalContent,
          modified: activeVaultChange.proposedContent,
          pendingCount: vaultPendingCount,
          onKeep: () => {
            void keepVaultProposalFile(activeVaultChange.path);
          },
          onUndo: () => discardVaultProposalFile(activeVaultChange.path),
          onKeepAll: () => {
            void keepAllVaultProposalFiles();
          },
          onDiscardAll: () => {
            void discardAllVaultProposalFiles();
          },
        }
      : null;

  const vaultAppliedUndo =
    !pendingVaultProposal && currentConversation?.lastAppliedVaultEdit
      ? { onUndo: () => undoLastVaultEdit() }
      : null;

  const value: WorkspaceConversationContextValue = {
    conversationList,
    activeConversationId,
    workspaceMissingConversation: !currentConversation,
    openConversationTabs,
    allConversationTabs,
    activeConversationTabId: activeConversationTabId || activeConversationTab?.id || "",
    fileNames,
    openEditorTabs,
    activeFile,
    activeContent,
    pendingPatch,
    chatMessages,
    currentFiles: currentConversation?.files ?? {},
    hasUnsavedChanges,
    selectFile: useCallback(
      async (file: string) => {
        if (currentConversation?.kind === "vault" && !Object.hasOwn(currentConversation.files, file)) {
          await loadVaultFileContent(file);
        }
        setActiveFile(file);
      },
      [currentConversation, loadVaultFileContent, setActiveFile],
    ),
    setPatch: (patch) => {
      setPendingPatch(patch);
      if (!currentConversation?.files[patch.file]) {
        setFileContent(patch.file, "");
      }
    },
    addMessage: addChatMessage,
    updateActiveFileContent: (next) => setFileContent(activeFile, next),
    openConversation: (id) => {
      setActiveConversation(id);
      onOpenConversation(id);
      const activeTabId = conversations[id]?.activeChatTabId;
      if (activeTabId) {
        void loadConversationTab(activeTabId);
      }
    },
    openConversationTab,
    closeConversationTab,
    setActiveConversationTab: (tabId) => {
      setActiveConversationTab(tabId);
      void loadConversationTab(tabId);
    },
    loadConversationTab,
    renameConversationTab,
    addConversationFile,
    removeConversationFile,
    removeConversationPath,
    renameConversationPath,
    mkdirConversationPath,
    closeEditorTab,
    saveActiveFile: () => saveFileSnapshot(activeFile),
    activeChatAiSelection,
    setActiveChatAiSelection,
    conversationKind: currentConversation?.kind,
    vaultFileTreeFilter,
    setVaultFileTreeFilter,
    pendingVaultProposal,
    pendingVaultPaths,
    pendingReviewByPath,
    vaultAiDiffReview,
    vaultAppliedUndo,
    saveRenderedPngToChat: (dataUrl: string) => {
      setFileContent("diagrams/preview.png", dataUrl);
    },
    openChatFolderInExplorer: () => {
      const id = activeConversationId;
      if (!id) return;
      void chatWorkspaceService.openChatFolder(id);
    },
  };

  return <WorkspaceConversationContext.Provider value={value}>{children}</WorkspaceConversationContext.Provider>;
}

export function useWorkspaceConversationContext() {
  const value = useContext(WorkspaceConversationContext);
  if (!value) {
    throw new Error("useWorkspaceConversationContext must be used within WorkspaceConversationProvider");
  }
  return value;
}
