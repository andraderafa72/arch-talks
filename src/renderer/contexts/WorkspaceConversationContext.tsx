import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ChatWorkspaceService } from "@/persistence/services/chatWorkspaceService";
import { useEditorStore } from "@/state/store";
import type { ChatConversationTab, ChatMessage, Conversation, Patch } from "@/types";
import type { LocalAiSelection } from "@/types/electron-api";

type WorkspaceConversationContextValue = {
  conversationList: Conversation[];
  activeConversationId: string;
  workspaceMissingConversation: boolean;
  openConversationTabs: ChatConversationTab[];
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
  } = useEditorStore();

  const currentConversation = conversations[activeConversationId];
  const fileNames = useMemo(
    () => (currentConversation ? Object.keys(currentConversation.files) : []),
    [currentConversation],
  );
  const activeFile = currentConversation?.activeFile ?? "main.tex";
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
  const openConversationTabs = currentConversation?.chatTabs ?? [];
  const activeConversationTabId = currentConversation?.activeChatTabId ?? "";
  const activeConversationTab =
    openConversationTabs.find((tab) => tab.id === activeConversationTabId) ?? openConversationTabs[0];
  const chatMessages = activeConversationTab?.messages ?? currentConversation?.chatMessages ?? [];
  const activeChatAiSelection = activeConversationTab?.aiSelection;
  const conversationList = useMemo(() => Object.values(conversations), [conversations]);

  const value: WorkspaceConversationContextValue = {
    conversationList,
    activeConversationId,
    workspaceMissingConversation: !currentConversation,
    openConversationTabs,
    activeConversationTabId: activeConversationTabId || activeConversationTab?.id || "",
    fileNames,
    openEditorTabs,
    activeFile,
    activeContent,
    pendingPatch,
    chatMessages,
    currentFiles: currentConversation?.files ?? {},
    hasUnsavedChanges,
    selectFile: setActiveFile,
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
