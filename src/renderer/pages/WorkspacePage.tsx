import { ChatPanel } from "@/components/chat/ChatPanel";
import { ConversationsSidebar } from "@/components/chat/ConversationsSidebar";
import { EditorPanel } from "@/components/editor/EditorPanel";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { VaultCategoryGate } from "@/components/vault/VaultCategoryGate";
import { VaultPlaygroundDrawer } from "@/components/vault/VaultPlaygroundDrawer";
import { Button } from "@/components/ui/button";
import { VaultPlaygroundProvider } from "@/contexts/VaultPlaygroundContext";
import { useWorkspaceConversationContext } from "@/contexts/WorkspaceConversationContext";
import { useWorkspaceLayoutContext } from "@/contexts/WorkspaceLayoutContext";
import { isElectronApp } from "@/lib/electronBridge";
import { useEditorStore } from "@/state/store";
import type { ThemeMode } from "@/types";
import { useEffect, useState } from "react";

type WorkspacePageProps = {
  theme: ThemeMode;
  onGoHome: () => void;
};

export function WorkspacePage({ theme, onGoHome }: WorkspacePageProps) {
  const {
    workspaceMissingConversation,
    activeConversationId,
    openConversationTabs,
    allConversationTabs,
    activeConversationTabId,
    fileNames,
    activeFile,
    openEditorTabs,
    activeContent,
    chatMessages,
    currentFiles,
    hasUnsavedChanges,
    selectFile,
    addMessage,
    openConversationTab,
    closeConversationTab,
    setActiveConversationTab,
    renameConversationTab,
    updateActiveFileContent,
    closeEditorTab,
    saveActiveFile,
    addConversationFile,
    mkdirConversationPath,
    renameConversationPath,
    removeConversationPath,
    saveRenderedPngToChat,
    openChatFolderInExplorer,
    activeChatAiSelection,
    setActiveChatAiSelection,
    vaultAiDiffReview,
    vaultAppliedUndo,
    pendingVaultPaths,
    pendingReviewByPath,
    conversationKind,
    vaultFileTreeFilter,
    setVaultFileTreeFilter,
  } = useWorkspaceConversationContext();
  const vaultConversation = useEditorStore((state) => state.conversations[activeConversationId]);
  const vaultName = vaultConversation?.vaultName ?? vaultConversation?.title;
  const locale = useEditorStore((state) => state.locale);
  const [vaultCategoryCheckDone, setVaultCategoryCheckDone] = useState(false);

  useEffect(() => {
    if (vaultConversation?.kind !== "vault" || !vaultConversation.vaultRootPath) {
      setVaultCategoryCheckDone(true);
      return;
    }
    if (vaultConversation.vaultCategory) {
      setVaultCategoryCheckDone(true);
      return;
    }
    setVaultCategoryCheckDone(false);
    void useEditorStore
      .getState()
      .refreshVaultDiskPaths()
      .finally(() => setVaultCategoryCheckDone(true));
  }, [
    vaultConversation?.kind,
    vaultConversation?.vaultRootPath,
    vaultConversation?.vaultCategory,
    activeConversationId,
  ]);

  const vaultNeedsCategory =
    vaultCategoryCheckDone &&
    vaultConversation?.kind === "vault" &&
    Boolean(vaultConversation.vaultRootPath) &&
    !vaultConversation.vaultCategory;
  const isElectron = isElectronApp();
  const { leftWidth, rightWidth, filesSidebarWidth, startHorizontalDrag, startFilesSidebarDrag } =
    useWorkspaceLayoutContext();

  if (workspaceMissingConversation) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">No conversation is active. Start from home or pick one from the list.</p>
        <Button onClick={onGoHome}>Go home</Button>
      </div>
    );
  }

  if (vaultNeedsCategory) {
    return <VaultCategoryGate documentId={activeConversationId} locale={locale} />;
  }

  return (
    <div
      className="grid min-h-0 flex-1"
      style={{ gridTemplateColumns: `${leftWidth}px 6px minmax(0,1fr) 6px ${rightWidth}px` }}
    >
      <div
        className="grid min-h-0 min-w-0"
        style={{ gridTemplateColumns: `${filesSidebarWidth}px 6px minmax(0,1fr)` }}
      >
        <ConversationsSidebar
          files={fileNames}
          activeFile={activeFile}
          hasUnsavedChanges={hasUnsavedChanges}
          pendingReviewByPath={pendingReviewByPath}
          showVaultFileTreeFilter={conversationKind === "vault"}
          vaultFileTreeFilter={vaultFileTreeFilter}
          onVaultFileTreeFilterChange={setVaultFileTreeFilter}
          onSelectFile={selectFile}
          onAddFile={addConversationFile}
          onMkdir={mkdirConversationPath}
          onRename={renameConversationPath}
          onDeletePath={removeConversationPath}
          onMovePath={renameConversationPath}
          onOpenFolder={openChatFolderInExplorer}
          isElectron={isElectron}
        />
        <div
          className="cursor-col-resize bg-[var(--ui-border)] hover:opacity-80"
          onMouseDown={startFilesSidebarDrag}
        />
        <ChatPanel
          messages={chatMessages}
          files={currentFiles}
          activeFile={activeFile}
          onMessage={addMessage}
          conversationTabs={openConversationTabs}
          allConversationTabs={allConversationTabs}
          activeConversationTabId={activeConversationTabId}
          onOpenConversationTab={openConversationTab}
          onCloseConversationTab={closeConversationTab}
          onSetActiveConversationTab={setActiveConversationTab}
          onRenameConversationTab={renameConversationTab}
          aiSelection={activeChatAiSelection}
          onAiSelectionChange={setActiveChatAiSelection}
        />
      </div>
      <div
        className="cursor-col-resize bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
        onMouseDown={() => startHorizontalDrag("left")}
      />

      <div className="min-h-0 min-w-0">
        <EditorPanel
          file={activeFile}
          value={activeContent}
          theme={theme}
          onChange={updateActiveFileContent}
          openTabs={openEditorTabs}
          activeFile={activeFile}
          hasUnsavedChanges={hasUnsavedChanges}
          onSelectTab={selectFile}
          onCloseTab={closeEditorTab}
          onSaveActiveFile={saveActiveFile}
          aiDiffReview={vaultAiDiffReview}
          appliedAiUndo={vaultAppliedUndo}
        />
      </div>

      <div
        className="cursor-col-resize bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
        onMouseDown={() => startHorizontalDrag("right")}
      />

      <div className="relative min-h-0">
        {conversationKind === "vault" ? (
          <VaultPlaygroundProvider
            documentId={activeConversationId}
            vaultName={vaultName}
            activeFile={activeFile}
            files={currentFiles}
            knownPaths={fileNames}
            onSelectFile={selectFile}
          >
            <PreviewPanel
              activeFile={activeFile}
              documentContent={activeContent}
              canSavePngToChat={isElectron}
              onSaveRenderedPng={saveRenderedPngToChat}
              showVaultPlayground
            />
            <VaultPlaygroundDrawer activeFile={activeFile} knownPaths={fileNames} />
          </VaultPlaygroundProvider>
        ) : (
          <PreviewPanel
            activeFile={activeFile}
            documentContent={activeContent}
            canSavePngToChat={isElectron}
            onSaveRenderedPng={saveRenderedPngToChat}
          />
        )}
      </div>
    </div>
  );
}
