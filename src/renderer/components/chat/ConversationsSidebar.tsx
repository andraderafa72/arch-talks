import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, FilePlus, FolderOpen, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PATH_DRAG_TYPE = "application/x-rag-talks-path";

type TreeNode = { name: string; fullPath: string; isFile: boolean; children: TreeNode[] };

type PathInputMode = "new-file" | "new-folder" | "rename" | null;

function buildFileTree(paths: string[]): TreeNode[] {
  const root: TreeNode = { name: "", fullPath: "", isFile: false, children: [] };
  for (const p of paths) {
    if (p.includes("..")) continue;
    const parts = p.split("/").filter(Boolean);
    if (parts.length === 0) continue;
    let node = root;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join("/");
      let child = node.children.find((c) => c.name === part);
      if (!child) {
        child = { name: part, fullPath, isFile, children: [] };
        node.children.push(child);
      } else if (isFile) {
        child.isFile = true;
        child.fullPath = fullPath;
      }
      node = child;
    }
  }
  const sortTree = (nodes: TreeNode[]): TreeNode[] => {
    const next = nodes.map((n) => ({ ...n, children: sortTree(n.children) }));
    return next.sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  };
  return sortTree(root.children);
}

function collectFolderPaths(nodes: TreeNode[]): Set<string> {
  const out = new Set<string>();
  const walk = (ns: TreeNode[]) => {
    for (const n of ns) {
      if (!n.isFile && n.fullPath) out.add(n.fullPath);
      if (!n.isFile) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

/** Visible tree order for shift-click range; skips `.keep` leaves. */
function flattenVisiblePaths(nodes: TreeNode[], collapsed: Set<string>): string[] {
  const out: string[] = [];
  for (const n of nodes) {
    if (n.isFile && n.name === ".keep") continue;
    out.push(n.fullPath);
    if (!n.isFile && !collapsed.has(n.fullPath)) {
      out.push(...flattenVisiblePaths(n.children, collapsed));
    }
  }
  return out;
}

/** Remove paths that are redundant because an ancestor is also selected. */
function pruneDeletionRoots(paths: Iterable<string>): string[] {
  const sorted = [...paths].sort((a, b) => a.length - b.length);
  const roots: string[] = [];
  for (const p of sorted) {
    if (roots.some((r) => p === r || p.startsWith(`${r}/`))) continue;
    roots.push(p);
  }
  return roots;
}

function previewRenameKeys(keys: string[], from: string, to: string): string[] | null {
  const fromNorm = from.trim();
  const toNorm = to.trim();
  if (!fromNorm || !toNorm || fromNorm === toNorm) return keys.slice();
  const isDirPrefix = (key: string) => key === fromNorm || key.startsWith(`${fromNorm}/`);
  const mapped: string[] = [];
  for (const k of keys) {
    if (isDirPrefix(k)) {
      const suffix = k === fromNorm ? "" : k.slice(fromNorm.length + 1);
      mapped.push(suffix ? `${toNorm}/${suffix}` : toNorm);
    } else {
      mapped.push(k);
    }
  }
  if (new Set(mapped).size !== mapped.length) return null;
  return mapped;
}

function basenamePath(p: string): string {
  const parts = p.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? p;
}

/** Directory containing the file path, or "" for workspace root. */
function parentDir(filePath: string): string {
  const p = filePath.replace(/\\/g, "/").trim();
  const i = p.lastIndexOf("/");
  if (i <= 0) return "";
  return p.slice(0, i);
}

/** Parent directory for new file/folder: selected folder, parent of selected file, or parent of active file. */
function resolveNewItemParentDir(
  folderPaths: ReadonlySet<string>,
  selectedPaths: ReadonlySet<string>,
  activeFile: string,
): string {
  if (selectedPaths.size === 1) {
    const only = [...selectedPaths][0];
    if (folderPaths.has(only)) {
      return only;
    }
    return parentDir(only);
  }
  return parentDir(activeFile);
}

type FileTreeItemProps = {
  node: TreeNode;
  activeFile: string;
  hasUnsavedChanges: (file: string) => boolean;
  selectedPaths: ReadonlySet<string>;
  collapsedPaths: ReadonlySet<string>;
  onPick: (path: string, isFile: boolean, event: React.MouseEvent) => void;
  onToggleCollapse: (folderPath: string) => void;
  onBeginPathDrag: (path: string) => void;
  onDragFolderEnter: (folderPath: string) => void;
  onDragFolderLeave: (folderPath: string) => void;
  dragOverFolder: string | null;
  onDropOnFolder: (targetFolder: string, e: React.DragEvent) => void;
  onRequestRename: (path: string) => void;
  onRequestDelete: (path: string) => void;
};

/** Inner row layout: chevron column + label column (same for every depth; nesting is via nested `<ul>` padding). */
const CHEVRON_SLOT_PX = 14;
const LABEL_INNER_START_PX = 14;

function FileTreeItem({
  node,
  activeFile,
  hasUnsavedChanges,
  selectedPaths,
  collapsedPaths,
  onPick,
  onToggleCollapse,
  onBeginPathDrag,
  onDragFolderEnter,
  onDragFolderLeave,
  dragOverFolder,
  onDropOnFolder,
  onRequestRename,
  onRequestDelete,
}: FileTreeItemProps) {
  const folderRowPaddingLeft = Math.max(0, LABEL_INNER_START_PX - CHEVRON_SLOT_PX);

  if (node.isFile && node.name === ".keep") {
    return null;
  }

  if (node.isFile) {
    const dirty = hasUnsavedChanges(node.fullPath);
    const isActive = node.fullPath === activeFile;
    const isSelected = selectedPaths.has(node.fullPath);
    return (
      <li className="list-none w-full min-w-0">
        <div
          className={cn(
            "group/row flex w-full min-w-0 items-baseline gap-1 rounded-md py-0.5 pl-[14px] pr-2 text-left text-sm leading-snug transition-colors",
            "border border-transparent",
            isActive
              ? "border-zinc-300 bg-zinc-100 font-medium text-zinc-950 shadow-sm ring-1 ring-zinc-300/90 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-zinc-600"
              : isSelected
                ? "border-zinc-300 bg-zinc-100/90 text-zinc-950 ring-1 ring-zinc-300/80 dark:border-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-50 dark:ring-zinc-600"
                : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900/70",
          )}
        >
          <button
            type="button"
            draggable
            onDragStart={(e) => {
              onBeginPathDrag(node.fullPath);
              e.dataTransfer.setData(PATH_DRAG_TYPE, node.fullPath);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => {
              onBeginPathDrag("");
            }}
            onClick={(ev) => onPick(node.fullPath, true, ev)}
            className="flex min-w-0 flex-1 items-baseline gap-1 text-left"
          >
            <span className="min-w-0 flex-1 truncate">{node.name}</span>
            {dirty ? <span className="shrink-0 text-amber-600 dark:text-amber-400">*</span> : null}
          </button>
          <span className="invisible ml-1 flex shrink-0 items-center gap-0.5 group-hover/row:visible group-focus-within/row:visible">
            <button
              type="button"
              className="rounded p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              onClick={(e) => {
                e.stopPropagation();
                onRequestRename(node.fullPath);
              }}
              aria-label={`Renomear ${node.name}`}
              title={`Renomear ${node.name}`}
            >
              <Pencil className="h-3 w-3" aria-hidden />
            </button>
            <button
              type="button"
              className="rounded p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              onClick={(e) => {
                e.stopPropagation();
                onRequestDelete(node.fullPath);
              }}
              aria-label={`Excluir ${node.name}`}
              title={`Excluir ${node.name}`}
            >
              <Trash2 className="h-3 w-3" aria-hidden />
            </button>
          </span>
        </div>
      </li>
    );
  }

  const collapsed = collapsedPaths.has(node.fullPath);
  const isSelected = selectedPaths.has(node.fullPath);
  const isOver = dragOverFolder === node.fullPath;

  return (
    <li className="list-none w-full min-w-0">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "move";
          onDragFolderEnter(node.fullPath);
        }}
        onDragLeave={(e) => {
          const related = e.relatedTarget as Node | null;
          if (related && e.currentTarget.contains(related)) return;
          onDragFolderLeave(node.fullPath);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDropOnFolder(node.fullPath, e);
        }}
        className={cn(
          "group/row flex w-full min-w-0 items-center gap-0 rounded-md py-0.5 pr-2 text-left text-sm font-medium leading-snug transition-colors",
          "border border-transparent",
          isSelected
            ? "border-zinc-300 bg-zinc-100 text-zinc-950 ring-1 ring-zinc-300/90 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-zinc-600"
            : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900/70",
          isOver && "bg-sky-100 ring-1 ring-sky-400 dark:bg-sky-950/50 dark:ring-sky-600",
        )}
        style={{ paddingLeft: folderRowPaddingLeft }}
      >
        <button
          type="button"
          draggable
          aria-expanded={!collapsed}
          aria-label={collapsed ? `${node.name || "Pasta"}, colapsada. Clique para expandir.` : `${node.name || "Pasta"}, expandida. Clique para colapsar.`}
          onDragStart={(e) => {
            onBeginPathDrag(node.fullPath);
            e.dataTransfer.setData(PATH_DRAG_TYPE, node.fullPath);
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragEnd={() => {
            onBeginPathDrag("");
          }}
          onClick={(ev) => {
            if (!ev.ctrlKey && !ev.metaKey && !ev.shiftKey) {
              onToggleCollapse(node.fullPath);
            }
            onPick(node.fullPath, false, ev);
          }}
          className="flex min-w-0 flex-1 items-center gap-0 text-left"
        >
          <span
            className="flex shrink-0 items-center justify-center text-zinc-500 dark:text-zinc-400"
            style={{ width: CHEVRON_SLOT_PX, minWidth: CHEVRON_SLOT_PX }}
            aria-hidden
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </span>
          <span className="min-w-0 flex-1 truncate">{node.name || "files"}</span>
        </button>
        <span className="invisible ml-1 flex shrink-0 items-center gap-0.5 group-hover/row:visible group-focus-within/row:visible">
          <button
            type="button"
            className="rounded p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            onClick={(e) => {
              e.stopPropagation();
              onRequestRename(node.fullPath);
            }}
            aria-label={`Renomear ${node.name || "files"}`}
            title={`Renomear ${node.name || "files"}`}
          >
            <Pencil className="h-3 w-3" aria-hidden />
          </button>
          <button
            type="button"
            className="rounded p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete(node.fullPath);
            }}
            aria-label={`Excluir ${node.name || "files"}`}
            title={`Excluir ${node.name || "files"}`}
          >
            <Trash2 className="h-3 w-3" aria-hidden />
          </button>
        </span>
      </div>
      {!collapsed ? (
        <ul className="ml-0 w-full min-w-0 border-l border-zinc-200 pl-3 dark:border-zinc-800">
          {node.children.map((c) => (
            <FileTreeItem
              key={c.fullPath || `${c.name}-${c.isFile}`}
              node={c}
              activeFile={activeFile}
              hasUnsavedChanges={hasUnsavedChanges}
              selectedPaths={selectedPaths}
              collapsedPaths={collapsedPaths}
              onPick={onPick}
              onToggleCollapse={onToggleCollapse}
              onBeginPathDrag={onBeginPathDrag}
              onDragFolderEnter={onDragFolderEnter}
              onDragFolderLeave={onDragFolderLeave}
              dragOverFolder={dragOverFolder}
              onDropOnFolder={onDropOnFolder}
              onRequestRename={onRequestRename}
              onRequestDelete={onRequestDelete}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

type FilesSidebarProps = {
  files: string[];
  activeFile: string;
  hasUnsavedChanges: (file: string) => boolean;
  onSelectFile: (file: string) => void;
  onAddFile: (path: string) => void;
  onMkdir: (path: string) => void;
  onRename: (from: string, to: string) => void;
  onDeletePath: (path: string) => void;
  onMovePath: (from: string, to: string) => void;
  onOpenFolder?: () => void;
  isElectron: boolean;
};

function iconBtnClass(extra?: string): string {
  return `h-8 w-8 shrink-0 p-0 ${extra ?? ""}`;
}

export function ConversationsSidebar({
  files,
  activeFile,
  hasUnsavedChanges,
  onSelectFile,
  onAddFile,
  onMkdir,
  onRename,
  onDeletePath,
  onMovePath,
  onOpenFolder,
  isElectron,
}: FilesSidebarProps) {
  const tree = useMemo(() => buildFileTree(files), [files]);
  const folderPaths = useMemo(() => collectFolderPaths(tree), [tree]);

  const [error, setError] = useState<string | null>(null);
  const [pathInputMode, setPathInputMode] = useState<PathInputMode>(null);
  const [pathInputValue, setPathInputValue] = useState("");
  const [renameFromPath, setRenameFromPath] = useState("");
  /** Parent directory for new file or new folder; no trailing slash. "" = root. */
  const [newFileDirPrefix, setNewFileDirPrefix] = useState("");
  const pathInputRef = useRef<HTMLInputElement>(null);
  const pathInputModeRef = useRef<PathInputMode>(null);

  useEffect(() => {
    pathInputModeRef.current = pathInputMode;
  }, [pathInputMode]);

  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(() => new Set());
  const selectionAnchorRef = useRef<string | null>(null);
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(() => new Set());
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [rootDropActive, setRootDropActive] = useState(false);
  const dragFromRef = useRef("");
  const beginPathDrag = useCallback((path: string) => {
    dragFromRef.current = path;
  }, []);

  const orderedVisiblePaths = useMemo(() => flattenVisiblePaths(tree, collapsedPaths), [tree, collapsedPaths]);

  const cancelPathInput = useCallback(() => {
    setPathInputMode(null);
    setPathInputValue("");
    setRenameFromPath("");
    setNewFileDirPrefix("");
  }, []);

  /** Close path input and cancel when focus leaves (create, or rename). */
  const handlePathInputBlur = useCallback(() => {
    window.setTimeout(() => {
      if (!pathInputModeRef.current) return;
      const el = pathInputRef.current;
      if (el && document.activeElement === el) return;
      cancelPathInput();
    }, 0);
  }, [cancelPathInput]);

  useEffect(() => {
    if (!pathInputMode || !pathInputRef.current) return;
    const el = pathInputRef.current;
    el.focus();
    if (pathInputMode === "rename") {
      requestAnimationFrame(() => el.select());
    }
  }, [pathInputMode]);

  const run = useCallback(
    (fn: () => void) => {
      setError(null);
      try {
        fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      }
    },
    [setError],
  );

  const handlePick = useCallback(
    (path: string, isFile: boolean, event: React.MouseEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      const shift = event.shiftKey;

      const fallbackAnchor =
        selectionAnchorRef.current ??
        (orderedVisiblePaths.includes(activeFile) ? activeFile : null);

      if (shift && fallbackAnchor) {
        const anchor = fallbackAnchor;
        const ia = orderedVisiblePaths.indexOf(anchor);
        const ib = orderedVisiblePaths.indexOf(path);
        if (ia !== -1 && ib !== -1) {
          const [lo, hi] = ia <= ib ? [ia, ib] : [ib, ia];
          const range = orderedVisiblePaths.slice(lo, hi + 1);
          setSelectedPaths(new Set(range));
          selectionAnchorRef.current = path;
          return;
        }
      }

      if (mod) {
        setSelectedPaths((prev) => {
          const next = new Set(prev);
          if (next.has(path)) next.delete(path);
          else next.add(path);
          return next;
        });
        selectionAnchorRef.current = path;
      } else {
        setSelectedPaths(new Set([path]));
        selectionAnchorRef.current = path;
      }

      if (isFile) {
        onSelectFile(path);
      }
    },
    [activeFile, onSelectFile, orderedVisiblePaths],
  );

  const toggleCollapse = useCallback((folderPath: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) next.delete(folderPath);
      else next.add(folderPath);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPaths(new Set());
    selectionAnchorRef.current = null;
  }, []);

  const openNewFile = useCallback(() => {
    setError(null);
    setPathInputMode("new-file");
    setPathInputValue("");
    setNewFileDirPrefix(resolveNewItemParentDir(folderPaths, selectedPaths, activeFile));
  }, [activeFile, folderPaths, selectedPaths]);

  const openNewFolder = useCallback(() => {
    setError(null);
    setPathInputMode("new-folder");
    setPathInputValue("");
    setNewFileDirPrefix(resolveNewItemParentDir(folderPaths, selectedPaths, activeFile));
  }, [activeFile, folderPaths, selectedPaths]);

  const openRename = useCallback((path: string) => {
    if (!path) return;
    setError(null);
    setNewFileDirPrefix("");
    setPathInputMode("rename");
    setPathInputValue(path);
    setRenameFromPath(path);
    setSelectedPaths(new Set([path]));
    selectionAnchorRef.current = path;
  }, []);

  const submitPathInput = useCallback(() => {
    const trimmed = pathInputValue.trim().replace(/\\/g, "/");
    if (!trimmed) return;
    if (!pathInputMode) return;

    if (pathInputMode === "new-file") {
      if (trimmed.includes("..") || trimmed.includes("/")) {
        setError("Digite apenas o nome do arquivo (sem caminhos).");
        return;
      }
      const fullPath = newFileDirPrefix ? `${newFileDirPrefix}/${trimmed}` : trimmed;
      run(() => onAddFile(fullPath));
      cancelPathInput();
      return;
    }

    if (pathInputMode === "new-folder") {
      if (newFileDirPrefix) {
        if (trimmed.includes("..") || trimmed.includes("/")) {
          setError("Digite apenas o nome da pasta (sem caminhos).");
          return;
        }
        const fullPath = `${newFileDirPrefix}/${trimmed}`.replace(/\/+$/, "");
        run(() => onMkdir(fullPath));
      } else {
        run(() => onMkdir(trimmed.replace(/\/+$/, "")));
      }
      cancelPathInput();
      return;
    }

    run(() => {
      if (pathInputMode === "rename") {
        const from = renameFromPath || activeFile;
        if (trimmed === from) return;
        onRename(from, trimmed);
        setSelectedPaths(new Set([trimmed]));
        selectionAnchorRef.current = trimmed;
      }
    });
    cancelPathInput();
  }, [
    activeFile,
    cancelPathInput,
    newFileDirPrefix,
    onAddFile,
    onMkdir,
    onRename,
    pathInputMode,
    pathInputValue,
    renameFromPath,
    run,
  ]);

  const applyMove = useCallback(
    (fromPath: string, targetFolder: string) => {
      const norm = fromPath.trim();
      if (!norm) return;
      if (norm === targetFolder) return;

      const base = basenamePath(norm);
      const toPath = targetFolder ? `${targetFolder}/${base}` : base;

      if (toPath === norm) return;

      if (targetFolder === norm || targetFolder.startsWith(`${norm}/`)) {
        setError("Cannot move a folder into itself or into a descendant.");
        return;
      }

      const preview = previewRenameKeys(files, norm, toPath);
      if (!preview) {
        setError("Cannot move: destination already exists or paths conflict.");
        return;
      }

      run(() => onMovePath(norm, toPath));
      setSelectedPaths(new Set([toPath]));
      selectionAnchorRef.current = toPath;
    },
    [files, onMovePath, run],
  );

  const handleDropOnFolder = useCallback(
    (targetFolder: string, e: React.DragEvent) => {
      const fromPath =
        dragFromRef.current || e.dataTransfer.getData(PATH_DRAG_TYPE);
      dragFromRef.current = "";
      setDragOverFolder(null);
      setRootDropActive(false);
      if (!fromPath) return;
      applyMove(fromPath, targetFolder);
    },
    [applyMove],
  );

  const handleRootDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const fromPath = dragFromRef.current || e.dataTransfer.getData(PATH_DRAG_TYPE);
      dragFromRef.current = "";
      setRootDropActive(false);
      setDragOverFolder(null);
      if (!fromPath) return;
      applyMove(fromPath, "");
    },
    [applyMove],
  );

  const typesHasPathMime = (dt: DataTransfer) =>
    Array.from(dt.types as Iterable<string>).includes(PATH_DRAG_TYPE);

  const placeholder =
    pathInputMode === "new-file"
      ? "chapter.tex"
      : pathInputMode === "new-folder"
        ? newFileDirPrefix
          ? "subpasta"
          : "notes ou notes/subpasta"
        : "novo caminho";

  const requestDeletePath = useCallback(
    (path: string) => {
      const roots = pruneDeletionRoots([path]);
      const msg = `Delete "${roots[0]}" from this chat?`;
      if (!window.confirm(msg)) return;
      run(() => {
        onDeletePath(path);
      });
      clearSelection();
    },
    [clearSelection, onDeletePath, run],
  );

  return (
    <div
      className="flex h-full min-h-0 flex-col border-r border-zinc-200 bg-[#fefefe] p-2 outline-none dark:border-zinc-700 dark:bg-zinc-950"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !pathInputMode) {
          e.preventDefault();
          clearSelection();
        }
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Files</div>
        {isElectron && onOpenFolder ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={iconBtnClass()}
            title="Abrir pasta deste chat no explorador"
            aria-label="Abrir pasta deste chat no explorador"
            onClick={onOpenFolder}
          >
            <FolderOpen className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="secondary"
          title="Novo arquivo"
          aria-label="Novo arquivo"
          className={iconBtnClass()}
          onClick={() => {
            openNewFile();
          }}
        >
          <FilePlus className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="secondary"
          title="Nova pasta"
          aria-label="Nova pasta"
          className={iconBtnClass()}
          onClick={() => {
            openNewFolder();
          }}
        >
          <FolderPlus className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      {pathInputMode ? (
        <div className="mb-2 flex flex-col gap-1">
          <label htmlFor="sidebar-path-input" className="sr-only">
            {pathInputMode === "new-file"
              ? "Nome do novo arquivo"
              : pathInputMode === "new-folder"
                ? newFileDirPrefix
                  ? "Nome da nova subpasta"
                  : "Caminho da nova pasta"
                : "Renomear para"}
          </label>
          <div
            className={cn(
              "flex min-w-0 items-center gap-0 rounded-sm border-x-0 border-t-0 border-b-2 border-b-zinc-400 bg-zinc-100 py-[0.25rem] dark:border-b-zinc-500 dark:bg-zinc-900",
              "focus-within:border-b-zinc-600 dark:focus-within:border-b-zinc-400",
            )}
          >
            {(pathInputMode === "new-file" || pathInputMode === "new-folder") && newFileDirPrefix ? (
              <span
                className="shrink-0 max-w-[min(55%,12rem)] truncate pl-[0.5rem] font-mono text-[11px] leading-snug text-zinc-500 dark:text-zinc-400"
                aria-hidden
              >
                {newFileDirPrefix}/
              </span>
            ) : null}
            <input
              ref={pathInputRef}
              id="sidebar-path-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={pathInputValue}
              placeholder={placeholder}
              className={cn(
                "min-w-0 flex-1 rounded-none border-0 bg-transparent px-[0.5rem] py-0 text-xs outline-none ring-0 shadow-none",
                (pathInputMode === "new-file" || pathInputMode === "new-folder") && newFileDirPrefix
                  ? "pl-0.5"
                  : "",
                "text-zinc-900 placeholder:text-zinc-500 dark:text-zinc-100 dark:placeholder:text-zinc-500",
              )}
              onChange={(e) => setPathInputValue(e.target.value)}
              onBlur={handlePathInputBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitPathInput();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelPathInput();
                }
              }}
            />
          </div>
        </div>
      ) : null}

      {error ? <p className="mb-1 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-auto rounded-md",
          rootDropActive && "bg-sky-50 ring-1 ring-sky-300 dark:bg-sky-950/30 dark:ring-sky-700",
        )}
        onDragOver={(e) => {
          if (!typesHasPathMime(e.dataTransfer)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setRootDropActive(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setRootDropActive(false);
        }}
        onDrop={handleRootDrop}
      >
        {tree.length === 0 ? (
          <p className="px-1 text-xs text-zinc-500 dark:text-zinc-400">No files yet.</p>
        ) : (
          <ul className="w-full min-w-0 space-y-0.5">
            {tree.map((n) => (
              <FileTreeItem
                key={n.fullPath || n.name}
                node={n}
                activeFile={activeFile}
                hasUnsavedChanges={hasUnsavedChanges}
                selectedPaths={selectedPaths}
                collapsedPaths={collapsedPaths}
                onPick={handlePick}
                onToggleCollapse={toggleCollapse}
                onBeginPathDrag={beginPathDrag}
                onDragFolderEnter={setDragOverFolder}
                onDragFolderLeave={(p) => setDragOverFolder((cur) => (cur === p ? null : cur))}
                dragOverFolder={dragOverFolder}
                onDropOnFolder={handleDropOnFolder}
                onRequestRename={openRename}
                onRequestDelete={requestDeletePath}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
