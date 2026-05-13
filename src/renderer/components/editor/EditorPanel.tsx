import Editor from "@monaco-editor/react";
import type { Monaco } from "@monaco-editor/react";
import { Pencil, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { editor as MonacoEditor } from "monaco-editor";

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
  const saveHandlerRef = useRef(onSaveActiveFile);
  const newFileHandlerRef = useRef(onNewFile);

  useEffect(() => {
    saveHandlerRef.current = onSaveActiveFile;
    newFileHandlerRef.current = onNewFile;
  }, [onSaveActiveFile, onNewFile]);

  useEffect(() => {
    if (!containerRef.current || !editorRef.current) return;

    const observer = new ResizeObserver(() => {
      editorRef.current?.layout();
    });
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

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
      <div ref={containerRef} className="min-h-0 min-w-0 flex-1">
        <Editor
          height="100%"
          path={activeTabPath}
          language={language ?? languageForFile(file)}
          value={value}
          theme={theme === "dark" ? "vs-dark" : "vs-light"}
          onChange={(next) => onChange(next ?? "")}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: "on",
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
