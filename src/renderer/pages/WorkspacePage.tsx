import { ChatPanel } from "@/components/chat/ChatPanel";
import { ConversationsSidebar } from "@/components/chat/ConversationsSidebar";
import { DiffPanel } from "@/components/diff/DiffPanel";
import { EditorPanel } from "@/components/editor/EditorPanel";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { Button } from "@/components/ui/button";
import { useWorkspaceConversationContext } from "@/contexts/WorkspaceConversationContext";
import { useWorkspaceLayoutContext } from "@/contexts/WorkspaceLayoutContext";
import type { ThemeMode } from "@/types";

type WorkspacePageProps = {
  theme: ThemeMode;
  onGoHome: () => void;
};

export function WorkspacePage({ theme, onGoHome }: WorkspacePageProps) {
  const {
    workspaceMissingConversation,
    openConversationTabs,
    activeConversationTabId,
    fileNames,
    activeFile,
    openEditorTabs,
    activeContent,
    pendingPatch,
    chatMessages,
    currentFiles,
    hasUnsavedChanges,
    selectFile,
    setPatch,
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
  } = useWorkspaceConversationContext();
  const isElectron = typeof window !== "undefined" && Boolean(window.electronApi);
  const { leftWidth, rightWidth, bottomHeight, startHorizontalDrag, startVerticalDrag } =
    useWorkspaceLayoutContext();

  if (workspaceMissingConversation) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">No conversation is active. Start from home or pick one from the list.</p>
        <Button onClick={onGoHome}>Go home</Button>
      </div>
    );
  }

  return (
    <div
      className="grid min-h-0 flex-1"
      style={{ gridTemplateColumns: `${leftWidth}px 6px minmax(0,1fr) 6px ${rightWidth}px` }}
    >
      <div className="grid min-h-0 grid-cols-[220px_minmax(0,1fr)]">
        <ConversationsSidebar
          files={fileNames}
          activeFile={activeFile}
          hasUnsavedChanges={hasUnsavedChanges}
          onSelectFile={selectFile}
          onAddFile={addConversationFile}
          onMkdir={mkdirConversationPath}
          onRename={renameConversationPath}
          onDeletePath={removeConversationPath}
          onMovePath={renameConversationPath}
          onOpenFolder={openChatFolderInExplorer}
          isElectron={isElectron}
        />
        <ChatPanel
          messages={chatMessages}
          files={currentFiles}
          activeFile={activeFile}
          onPatchReceived={setPatch}
          onMessage={addMessage}
          conversationTabs={openConversationTabs}
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

      <div className="grid min-h-0" style={{ gridTemplateRows: `minmax(0,1fr) 6px ${bottomHeight}px` }}>
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
        />
        <div
          className="cursor-row-resize bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
          onMouseDown={startVerticalDrag}
        />
        <DiffPanel patch={pendingPatch} fileContent={currentFiles[pendingPatch?.file ?? activeFile] ?? ""} />
      </div>

      <div
        className="cursor-col-resize bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
        onMouseDown={() => startHorizontalDrag("right")}
      />

        <PreviewPanel
          activeFile={activeFile}
          documentContent={activeContent}
          canSavePngToChat={isElectron}
          onSaveRenderedPng={saveRenderedPngToChat}
        />
    </div>
  );
}
