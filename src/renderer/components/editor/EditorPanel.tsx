import Editor, { DiffEditor } from "@monaco-editor/react";
import type { Monaco } from "@monaco-editor/react";
import { Pencil, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/state/store";

const diffToolbarBtnClass = "h-6 px-2 text-xs font-normal";
const diffDiscardBtnClass = `${diffToolbarBtnClass} text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300`;
const diffKeepBtnClass = `${diffToolbarBtnClass} font-medium text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300`;

export type AiDiffReviewToolbar = {
  proposalId: string;
  original: string;
  modified: string;
  onKeep: () => void;
  onUndo: () => void;
  onKeepAll?: () => void;
  onDiscardAll?: () => void;
  /** Shown in toolbar when batch actions are available. */
  pendingCount?: number;
};

type EditorPanelProps = {
  file: string;
  value: string;
  theme: "light" | "dark";
  onChange: (next: string) => void;
  /** When set, overrides the language inferred from `file`. */
  language?: string;
  /** Tab strip + shortcuts; omit for standalone editors (tools). */
  openTabs?: string[];
  activeFile?: string;
  hasUnsavedChanges?: (path: string) => boolean;
  onSelectTab?: (path: string) => void;
  onCloseTab?: (path: string) => void;
  onRenameTab?: (path: string) => void;
  /** Persist current buffer (Ctrl/Cmd+S when Monaco is focused). */
  onSaveActiveFile?: () => void;
  /** New file / tab (Ctrl/Cmd+N when Monaco is focused). */
  onNewFile?: () => void;
  /** When set, the main area shows a read-only diff instead of the editor. */
  aiDiffReview?: AiDiffReviewToolbar | null;
  /** When not in diff review, optional one-step undo for the last applied AI edit. */
  appliedAiUndo?: { onUndo: () => void } | null;
};

const languageForFile = (file: string) => {
  if (file.endsWith(".tex")) return "latex";
  if (file.endsWith(".md")) return "markdown";
  if (file.endsWith(".puml")) return "plaintext";
  return "plaintext";
};

const tabLabel = (path: string) => {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
};

export function EditorPanel({
  file,
  value,
  theme,
  onChange,
  language,
  openTabs,
  activeFile,
  hasUnsavedChanges,
  onSelectTab,
  onCloseTab,
  onRenameTab,
  onSaveActiveFile,
  onNewFile,
  aiDiffReview,
  appliedAiUndo,
}: EditorPanelProps) {
  const showTabBar = openTabs !== undefined;
  const tabList = openTabs ?? [file];
  const activeTabPath = activeFile ?? file;
  const isDirty = hasUnsavedChanges ?? (() => false);
  const selectTab = onSelectTab ?? (() => {});
  const closeTab = onCloseTab ?? (() => {});
  const renameTab = onRenameTab ?? (() => {});

  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const diffEditorRef = useRef<MonacoEditor.IStandaloneDiffEditor | null>(null);
  const saveHandlerRef = useRef(onSaveActiveFile);
  const newFileHandlerRef = useRef(onNewFile);

  useEffect(() => {
    saveHandlerRef.current = onSaveActiveFile;
    newFileHandlerRef.current = onNewFile;
  }, [onSaveActiveFile, onNewFile]);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      editorRef.current?.layout();
      diffEditorRef.current?.layout();
    });
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!aiDiffReview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        aiDiffReview.onUndo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [aiDiffReview]);

  const handleMount = (editor: MonacoEditor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    editor.layout();
    if (onSaveActiveFile) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        saveHandlerRef.current?.();
      });
    }
    if (onNewFile) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN, () => {
        newFileHandlerRef.current?.();
      });
    }
  };

  const handleDiffMount = (editor: MonacoEditor.IStandaloneDiffEditor, _monaco: Monaco) => {
    diffEditorRef.current = editor;
    editor.layout();
  };

  const monacoTheme = theme === "dark" ? "vs-dark" : "vs-light";
  const editorLanguage = language ?? languageForFile(file);

  const showAppliedUndoBar = !aiDiffReview && appliedAiUndo;
  const locale = useEditorStore((s) => s.locale);
  const diffLabels =
    locale === "pt"
      ? {
          hint: "Original à esquerda, proposta à direita.",
          esc: "Esc descarta este arquivo.",
          discard: "Descartar",
          keep: "Manter",
          discardAll: "Descartar tudo",
          keepAll: "Manter tudo",
        }
      : {
          hint: "Original on the left, proposed on the right.",
          esc: "Esc discards this file.",
          discard: "Discard",
          keep: "Keep",
          discardAll: "Discard all",
          keepAll: "Keep all",
        };
  const showBatchActions = Boolean(aiDiffReview?.onKeepAll && aiDiffReview?.onDiscardAll);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      {showTabBar ? (
      <div
        className="flex shrink-0 gap-0 overflow-x-auto border-b border-zinc-200 bg-zinc-50/90 dark:border-zinc-700 dark:bg-zinc-900/80"
        role="tablist"
        aria-label="Open files"
      >
        {tabList.map((tabPath) => {
          const active = tabPath === activeTabPath;
          const dirty = isDirty(tabPath);
          return (
            <div
              key={tabPath}
              role="tab"
              aria-selected={active}
              className={`flex max-w-[200px] shrink-0 items-center gap-1 border-r border-zinc-200 px-2 py-1.5 text-xs dark:border-zinc-700 ${
                active
                  ? "border-b-2 border-b-zinc-800 bg-white dark:border-b-zinc-200 dark:bg-zinc-950"
                  : "border-b-2 border-b-transparent bg-zinc-100/80 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              }`}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-zinc-800 dark:text-zinc-100"
                onClick={() => selectTab(tabPath)}
                title={tabPath}
              >
                <span
                  className={`shrink-0 font-medium ${dirty ? "text-amber-600 dark:text-amber-400" : "text-zinc-400 dark:text-zinc-500"}`}
                  aria-hidden
                >
                  {dirty ? "●" : "○"}
                </span>
                <span className="truncate">{tabLabel(tabPath)}</span>
              </button>
              <button
                type="button"
                className="shrink-0 rounded p-0.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                aria-label={`Rename ${tabLabel(tabPath)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  renameTab(tabPath);
                }}
              >
                <Pencil className="size-3.5" strokeWidth={2} />
              </button>
              <button
                type="button"
                className="shrink-0 rounded p-0.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                aria-label={`Close ${tabLabel(tabPath)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tabPath);
                }}
              >
                <X className="size-3.5" strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>
      ) : null}

      {aiDiffReview ? (
        <div
          className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900/80"
          role="toolbar"
          aria-label={locale === "pt" ? "Revisão da alteração sugerida pela IA" : "AI suggested change review"}
        >
          <p className="min-w-0 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            {diffLabels.hint}{" "}
            <kbd className="rounded border border-zinc-300 px-0.5 text-[10px] dark:border-zinc-600">Esc</kbd>{" "}
            {diffLabels.esc}
            {showBatchActions && aiDiffReview.pendingCount ? (
              <span className="text-zinc-400 dark:text-zinc-500"> · {aiDiffReview.pendingCount}</span>
            ) : null}
          </p>
          <div className="flex shrink-0 items-center gap-0.5">
            {showBatchActions ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  className={diffDiscardBtnClass}
                  onClick={aiDiffReview.onDiscardAll}
                >
                  {diffLabels.discardAll}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className={diffKeepBtnClass}
                  onClick={aiDiffReview.onKeepAll}
                >
                  {diffLabels.keepAll}
                </Button>
                <span className="mx-0.5 h-3.5 w-px bg-zinc-300 dark:bg-zinc-600" aria-hidden="true" />
              </>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className={diffDiscardBtnClass}
              onClick={aiDiffReview.onUndo}
            >
              {diffLabels.discard}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={diffKeepBtnClass}
              onClick={aiDiffReview.onKeep}
            >
              {diffLabels.keep}
            </Button>
          </div>
        </div>
      ) : null}

      {showAppliedUndoBar ? (
        <div
          className="flex shrink-0 items-center justify-end gap-2 border-b border-zinc-200 bg-amber-50/80 px-2 py-1.5 dark:border-zinc-700 dark:bg-amber-950/30"
          role="toolbar"
          aria-label="Desfazer alteração da IA"
        >
          <Button type="button" variant="secondary" size="sm" onClick={appliedAiUndo.onUndo}>
            Desfazer IA
          </Button>
        </div>
      ) : null}

      <div ref={containerRef} className="min-h-0 min-w-0 flex-1">
        {aiDiffReview ? (
          <DiffEditor
            key={aiDiffReview.proposalId}
            height="100%"
            width="100%"
            language={editorLanguage}
            theme={monacoTheme}
            original={aiDiffReview.original}
            modified={aiDiffReview.modified}
            originalModelPath={`${aiDiffReview.proposalId}/original`}
            modifiedModelPath={`${aiDiffReview.proposalId}/modified`}
            onMount={handleDiffMount}
            options={{
              readOnly: true,
              renderSideBySide: true,
              minimap: { enabled: false },
              wordWrap: "on",
              fontSize: 14,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        ) : (
          <Editor
            height="100%"
            path={activeTabPath}
            language={editorLanguage}
            value={value}
            theme={monacoTheme}
            onChange={(next) => onChange(next ?? "")}
            onMount={handleMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: "on",
              automaticLayout: true,
            }}
          />
        )}
      </div>
    </div>
  );
}
