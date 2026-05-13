/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useTextFileWorkspace } from "@/hooks/useTextFileWorkspace";

const DEFAULT_MARKDOWN = [
  "# Markdown to PDF",
  "",
  "Edit this **markdown** on the left. The preview updates live with document-oriented formatting.",
  "",
  "> Use headings, tables, quotes, lists and code blocks to compose a richer document.",
  "",
  "## Example Section",
  "",
  "- Bullet one with `inline code`",
  "- Bullet two with **strong emphasis**",
  "",
  "| Feature | Status |",
  "| --- | --- |",
  "| Tables | Supported |",
  "| Code blocks | Supported |",
  "",
  "```ts",
  "const hello = \"world\";",
  "```",
  "",
].join("\n");

const MARKDOWN_PDF_STORAGE_KEY = "rag-talks-markdown-to-pdf-workspace";
const DEFAULT_MD_FILE = "content.md";

type MarkdownToPdfToolContextValue = {
  files: Record<string, string>;
  savedSnapshot: Record<string, string>;
  activeFile: string;
  activeMarkdown: string;
  openEditorTabs: string[];
  leftWidth: number;
  saveError: string | null;
  pendingClosePath: string | null;
  hasUnsavedChanges: (path: string) => boolean;
  updateActiveContent: (next: string) => void;
  selectFile: (path: string) => void;
  requestCloseTab: (path: string) => void;
  cancelCloseDialog: () => void;
  confirmDiscardClose: () => void;
  saveActiveFile: () => Promise<void>;
  renameTab: (fromPath: string) => void;
  addNewMarkdownFile: () => void;
  openMarkdownFile: () => Promise<void>;
  startHorizontalDrag: () => void;
  getTabBasename: (path: string) => string;
};

const MarkdownToPdfToolContext = createContext<MarkdownToPdfToolContextValue | null>(null);

export function MarkdownToPdfToolProvider({ children }: { children: ReactNode }) {
  const workspace = useTextFileWorkspace({
    storageKey: MARKDOWN_PDF_STORAGE_KEY,
    defaultFile: DEFAULT_MD_FILE,
    defaultContent: DEFAULT_MARKDOWN,
    defaultExtension: ".md",
    untitledPrefix: "untitled",
    saveUnavailableMessage: "Electron bridge loaded, but saveTextWithDialog is unavailable. Restart the desktop app.",
    openUnavailableMessage: "Electron bridge loaded, but openTextWithDialog is unavailable. Restart the desktop app.",
  });

  const value = useMemo<MarkdownToPdfToolContextValue>(
    () => ({
      files: workspace.files,
      savedSnapshot: workspace.savedSnapshot,
      activeFile: workspace.activeFile,
      activeMarkdown: workspace.activeContent,
      openEditorTabs: workspace.openEditorTabs,
      leftWidth: workspace.leftWidth,
      saveError: workspace.saveError,
      pendingClosePath: workspace.pendingClosePath,
      hasUnsavedChanges: workspace.hasUnsavedChanges,
      updateActiveContent: workspace.updateActiveContent,
      selectFile: workspace.selectFile,
      requestCloseTab: workspace.requestCloseTab,
      cancelCloseDialog: workspace.cancelCloseDialog,
      confirmDiscardClose: workspace.confirmDiscardClose,
      saveActiveFile: workspace.saveActiveFile,
      renameTab: workspace.renameTab,
      addNewMarkdownFile: workspace.addNewFile,
      openMarkdownFile: workspace.openTextFile,
      startHorizontalDrag: workspace.startHorizontalDrag,
      getTabBasename: workspace.getTabBasename,
    }),
    [workspace],
  );

  return <MarkdownToPdfToolContext.Provider value={value}>{children}</MarkdownToPdfToolContext.Provider>;
}

export function useMarkdownToPdfToolContext() {
  const value = useContext(MarkdownToPdfToolContext);
  if (!value) {
    throw new Error("useMarkdownToPdfToolContext must be used within MarkdownToPdfToolProvider");
  }
  return value;
}
