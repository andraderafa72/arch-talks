import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import { EditorPanel } from "@/components/editor/EditorPanel";
import { MarkdownToPdfChatPopover } from "@/components/tools/MarkdownToPdfChatPopover";
import { ToolEditorHeader } from "@/components/tools/ToolEditorHeader";
import { AiEditProposalDiffDialog } from "@/components/tools/AiEditProposalDiffDialog";
import { ToolSplitLayout } from "@/components/tools/ToolSplitLayout";
import { UnsavedTabCloseDialog } from "@/components/tools/UnsavedTabCloseDialog";
import {
  createDocumentMarkdownComponents,
  markdownPlugins,
  PDF_PALETTES,
  PRINT_CSS,
  PRINT_MODE_CLASS,
  PRINT_MODE_STYLE,
  PRINT_ROOT_ID,
  type MarkdownToPdfTheme,
} from "@/components/tools/markdownToPdfConfig";
import { Button } from "@/components/ui/button";
import { MarkdownToPdfChatProvider } from "@/contexts/MarkdownToPdfChatContext";
import { MarkdownToPdfToolProvider, useMarkdownToPdfToolContext } from "@/contexts/MarkdownToPdfToolContext";
import { usePdfDocumentExport } from "@/hooks/usePdfDocumentExport";
import type { AiEditProposal } from "@/types";

type MarkdownToPdfToolProps = {
  theme: MarkdownToPdfTheme;
};

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}


function MarkdownToPdfToolContent({ theme }: MarkdownToPdfToolProps) {
  const previewPalette = PDF_PALETTES[theme];
  const printPalette = PDF_PALETTES.light;
  const {
    activeFile,
    activeMarkdown,
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
    addNewMarkdownFile,
    openMarkdownFile,
    startHorizontalDrag,
    getTabBasename,
  } = useMarkdownToPdfToolContext();

  const { exportPdf, exportError, exporting } = usePdfDocumentExport();
  const [pendingAiProposal, setPendingAiProposal] = useState<AiEditProposal | null>(null);

  const handlePatchReceived = useCallback((proposal: AiEditProposal) => {
    setPendingAiProposal(proposal);
  }, []);

  const applyAiProposal = useCallback(() => {
    if (!pendingAiProposal) return;
    updateActiveContent(pendingAiProposal.proposedContent);
    setPendingAiProposal(null);
  }, [pendingAiProposal, updateActiveContent]);

  const dismissAiProposal = useCallback(() => {
    setPendingAiProposal(null);
  }, []);
  const previewComponents = useMemo(() => createDocumentMarkdownComponents(previewPalette), [previewPalette]);
  const printComponents = useMemo(() => createDocumentMarkdownComponents(printPalette), [printPalette]);

  const pdfBasename =
    activeFile.replace(/^.*[/\\]/, "").replace(/\.md$/i, "") || "document";

  const downloadPdf = useCallback(async () => {
    await exportPdf({
      filename: `${pdfBasename}.pdf`,
      beforePrint: async () => {
        document.body.classList.add(PRINT_MODE_CLASS);
        await waitForNextPaint();
      },
      afterPrint: () => {
        document.body.classList.remove(PRINT_MODE_CLASS);
      },
    });
  }, [exportPdf, pdfBasename]);

  const printPortal = typeof document !== "undefined"
    ? createPortal(
      <div
        id={PRINT_ROOT_ID}
        aria-hidden="true"
        style={{
          display: "none",
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          background: "#fff",
          zIndex: -1,
        }}
      >
        <style>{PRINT_CSS}</style>
        <article
          className="document markdown-doc"
          style={{
            backgroundColor: printPalette.background,
            color: printPalette.text,
          }}
        >
          <ReactMarkdown remarkPlugins={markdownPlugins} components={printComponents}>
            {activeMarkdown}
          </ReactMarkdown>
        </article>
      </div>,
      document.body,
    )
    : null;

  return (
    <MarkdownToPdfChatProvider
      activeFile={activeFile}
      fileContent={activeMarkdown}
      onPatchReceived={handlePatchReceived}
    >
      <>
      <style>{PRINT_MODE_STYLE}</style>
      <ToolSplitLayout
        leftWidth={leftWidth}
        onStartResize={startHorizontalDrag}
        left={
          <div className="flex h-full min-h-0 min-w-0 flex-col">
            <ToolEditorHeader
              newLabel="New markdown file"
              openLabel="Open markdown file"
              onNewFile={addNewMarkdownFile}
              onOpenFile={() => void openMarkdownFile()}
            />
            <div className="min-h-0 min-w-0 flex-1">
              {activeFile ? (
                <EditorPanel
                  file={activeFile}
                  value={activeMarkdown}
                  theme={theme}
                  onChange={updateActiveContent}
                  openTabs={openEditorTabs}
                  activeFile={activeFile}
                  hasUnsavedChanges={hasUnsavedChanges}
                  onSelectTab={selectFile}
                  onCloseTab={requestCloseTab}
                  onRenameTab={renameTab}
                  onSaveActiveFile={() => void saveActiveFile()}
                  onNewFile={addNewMarkdownFile}
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6">
                  <div className="max-w-sm text-center">
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No markdown files open</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Create a new file to start editing. It will only be written to disk after the first save.
                    </p>
                    <Button type="button" size="sm" className="mt-3" onClick={addNewMarkdownFile}>
                      Create file
                    </Button>
                    <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => void openMarkdownFile()}>
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
              <Button type="button" size="sm" disabled={exporting} onClick={() => void downloadPdf()}>
                {exporting ? "Exporting..." : "Download PDF"}
              </Button>
            </div>
            {saveError ? (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {saveError}
              </p>
            ) : null}
            {exportError ? (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {exportError}
              </p>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            <div className="rounded-md border border-zinc-200 dark:border-zinc-700 p-2 overflow-x-auto">
              <style>{PRINT_CSS}</style>
              <article
                className="document markdown-doc"
                style={{
                  backgroundColor: previewPalette.background,
                  color: previewPalette.text,
                }}
              >
                <ReactMarkdown remarkPlugins={markdownPlugins} components={previewComponents}>
                  {activeMarkdown}
                </ReactMarkdown>
              </article>
            </div>
          </div>
          </>
        }
      />
      {printPortal}
      {pendingAiProposal ? (
        <AiEditProposalDiffDialog
          proposal={pendingAiProposal}
          theme={theme}
          onApply={applyAiProposal}
          onDismiss={dismissAiProposal}
        />
      ) : null}
      <MarkdownToPdfChatPopover />
      <UnsavedTabCloseDialog
        filePath={pendingClosePath}
        getTabBasename={getTabBasename}
        onCancel={cancelCloseDialog}
        onConfirm={confirmDiscardClose}
      />
      </>
    </MarkdownToPdfChatProvider>
  );
}

export function MarkdownToPdfTool({ theme }: MarkdownToPdfToolProps) {
  return (
    <MarkdownToPdfToolProvider>
      <MarkdownToPdfToolContent theme={theme} />
    </MarkdownToPdfToolProvider>
  );
}
