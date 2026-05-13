import { useCallback, useState } from "react";
import { EditorPanel } from "@/components/editor/EditorPanel";
import { ToolEditorHeader } from "@/components/tools/ToolEditorHeader";
import { ToolSplitLayout } from "@/components/tools/ToolSplitLayout";
import { UmlDiagramChatPopover } from "@/components/tools/UmlDiagramChatPopover";
import { UnsavedTabCloseDialog } from "@/components/tools/UnsavedTabCloseDialog";
import { Button } from "@/components/ui/button";
import { UmlDiagramChatProvider } from "@/contexts/UmlDiagramChatContext";
import { usePlantUmlPreview } from "@/hooks/usePlantUmlPreview";
import { useTextFileWorkspace } from "@/hooks/useTextFileWorkspace";
import type { AiEditProposal, AppliedAiEdit } from "@/types";

const DEFAULT_PLANTUML = `@startuml
Alice -> Bob: hello
Bob --> Alice: hi
@enduml
`;

const UML_RENDER_STORAGE_KEY = "rag-talks-uml-render-workspace";
const DEFAULT_UML_FILE = "diagram.puml";

type UmlRenderToolProps = {
  theme: "light" | "dark";
};

function UmlRenderToolContent({ theme }: UmlRenderToolProps) {
  const {
    activeFile,
    activeContent: source,
    openEditorTabs,
    leftWidth,
    saveError,
    pendingClosePath,
    hasUnsavedChanges,
    updateActiveContent,
    selectFile,
    requestCloseTab,
    cancelCloseDialog,
    confirmDiscardClose,
    saveActiveFile,
    renameTab,
    addNewFile,
    openTextFile,
    startHorizontalDrag,
    getTabBasename,
  } = useTextFileWorkspace({
    storageKey: UML_RENDER_STORAGE_KEY,
    defaultFile: DEFAULT_UML_FILE,
    defaultContent: DEFAULT_PLANTUML,
    defaultExtension: ".puml",
    untitledPrefix: "diagram",
    saveUnavailableMessage: "Electron bridge loaded, but saveTextWithDialog is unavailable. Restart the desktop app.",
    openUnavailableMessage: "Electron bridge loaded, but openTextWithDialog is unavailable. Restart the desktop app.",
  });
  const { previewUrl, lastBlob, loading, error } = usePlantUmlPreview(source);

  const [pendingAiProposal, setPendingAiProposal] = useState<AiEditProposal | null>(null);
  const [lastAppliedAiEdit, setLastAppliedAiEdit] = useState<AppliedAiEdit | null>(null);

  const handlePatchReceived = useCallback((proposal: AiEditProposal) => {
    setLastAppliedAiEdit(null);
    setPendingAiProposal(proposal);
  }, []);

  const keepAiProposal = useCallback(() => {
    if (!pendingAiProposal) return;
    const applied: AppliedAiEdit = {
      id: crypto.randomUUID(),
      file: pendingAiProposal.file,
      previousContent: pendingAiProposal.originalContent,
      appliedPatch: pendingAiProposal.patch,
      timestamp: new Date().toISOString(),
    };
    updateActiveContent(pendingAiProposal.proposedContent);
    setPendingAiProposal(null);
    setLastAppliedAiEdit(applied);
  }, [pendingAiProposal, updateActiveContent]);

  const discardAiProposal = useCallback(() => {
    setPendingAiProposal(null);
  }, []);

  const undoAppliedAiEdit = useCallback(() => {
    if (!lastAppliedAiEdit) return;
    updateActiveContent(lastAppliedAiEdit.previousContent);
    setLastAppliedAiEdit(null);
  }, [lastAppliedAiEdit, updateActiveContent]);

  const downloadPng = useCallback(() => {
    if (!lastBlob) return;
    const url = URL.createObjectURL(lastBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(activeFile || "diagram").replace(/\.[^/.]+$/i, "")}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeFile, lastBlob]);

  return (
    <UmlDiagramChatProvider
      activeFile={activeFile}
      fileContent={source}
      onPatchReceived={handlePatchReceived}
    >
      <>
        <ToolSplitLayout
          leftWidth={leftWidth}
          onStartResize={startHorizontalDrag}
          left={
            <div className="flex h-full min-h-0 min-w-0 flex-col">
              <ToolEditorHeader
                newLabel="New UML file"
                openLabel="Open UML file"
                onNewFile={addNewFile}
                onOpenFile={() => void openTextFile()}
              />
              <div className="min-h-0 min-w-0 flex-1">
                {activeFile ? (
                  <EditorPanel
                    file={activeFile}
                    value={source}
                    theme={theme}
                    onChange={updateActiveContent}
                    language="plaintext"
                    openTabs={openEditorTabs}
                    activeFile={activeFile}
                    hasUnsavedChanges={hasUnsavedChanges}
                    onSelectTab={selectFile}
                    onCloseTab={requestCloseTab}
                    onRenameTab={renameTab}
                    onSaveActiveFile={() => void saveActiveFile()}
                    onNewFile={addNewFile}
                    aiDiffReview={
                      pendingAiProposal && pendingAiProposal.file === activeFile
                        ? {
                            proposalId: pendingAiProposal.id,
                            original: pendingAiProposal.originalContent,
                            modified: pendingAiProposal.proposedContent,
                            onKeep: keepAiProposal,
                            onUndo: discardAiProposal,
                          }
                        : null
                    }
                    appliedAiUndo={
                      !pendingAiProposal &&
                      lastAppliedAiEdit &&
                      lastAppliedAiEdit.file === activeFile
                        ? { onUndo: undoAppliedAiEdit }
                        : null
                    }
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-6">
                    <div className="max-w-sm text-center">
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No UML files open</p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Create a new file to start editing. It will only be written to disk after the first save.
                      </p>
                      <Button type="button" size="sm" className="mt-3" onClick={addNewFile}>
                        Create file
                      </Button>
                      <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => void openTextFile()}>
                        Open file
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          }
          right={
            <>
              <div className="flex shrink-0 flex-col gap-1 border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">Preview</span>
                  <Button type="button" size="sm" disabled={!lastBlob} onClick={downloadPng}>
                    Download PNG
                  </Button>
                </div>
                {saveError ? (
                  <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                    {saveError}
                  </p>
                ) : null}
              </div>
              <div className="flex min-h-0 flex-1 flex-col items-center justify-start overflow-auto p-3">
                {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
                {!error && source.trim() && loading ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Rendering…</p>
                ) : null}
                {!error && previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="PlantUML diagram"
                    className="max-w-full rounded border border-zinc-200 dark:border-zinc-700"
                  />
                ) : null}
                {!source.trim() && !error ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Enter PlantUML above.</p>
                ) : null}
              </div>
            </>
          }
        />
        <UmlDiagramChatPopover />
        <UnsavedTabCloseDialog
          filePath={pendingClosePath}
          getTabBasename={getTabBasename}
          onCancel={cancelCloseDialog}
          onConfirm={confirmDiscardClose}
        />
      </>
    </UmlDiagramChatProvider>
  );
}

export function UmlRenderTool({ theme }: UmlRenderToolProps) {
  return <UmlRenderToolContent theme={theme} />;
}
