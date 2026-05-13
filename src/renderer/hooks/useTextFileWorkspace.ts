import { useCallback, useEffect, useMemo, useState } from "react";

type TextWorkspaceV1 = {
  version: 1;
  files: Record<string, string>;
  savedSnapshot: Record<string, string>;
  savedPaths?: Record<string, string>;
  activeFile: string;
  openEditorTabs: string[];
};

export type TextFileWorkspaceOptions = {
  storageKey: string;
  defaultFile: string;
  defaultContent: string;
  defaultExtension: string;
  untitledPrefix: string;
  saveUnavailableMessage: string;
  openUnavailableMessage: string;
};

const PERSIST_DEBOUNCE_MS = 400;

function isRecordOfStrings(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value as Record<string, unknown>).every(([, v]) => typeof v === "string");
}

function normalizeOpenEditorTabs(w: TextWorkspaceV1): string[] {
  const keys = new Set(Object.keys(w.files));
  const filtered = w.openEditorTabs.filter((f) => keys.has(f));
  if (filtered.length > 0) return filtered;
  if (keys.has(w.activeFile)) return [w.activeFile];
  const sorted = [...keys].sort();
  return sorted.length > 0 ? [sorted[0]!] : [];
}

function createDefaultWorkspace(options: TextFileWorkspaceOptions): TextWorkspaceV1 {
  return {
    version: 1,
    files: { [options.defaultFile]: options.defaultContent },
    savedSnapshot: { [options.defaultFile]: options.defaultContent },
    savedPaths: {},
    activeFile: options.defaultFile,
    openEditorTabs: [options.defaultFile],
  };
}

function parseStoredWorkspace(raw: string): TextWorkspaceV1 | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const o = data as Record<string, unknown>;
  if (o.version !== 1) return null;
  if (!isRecordOfStrings(o.files)) return null;
  const files = o.files;
  let savedSnapshot: Record<string, string>;
  if (isRecordOfStrings(o.savedSnapshot)) {
    savedSnapshot = { ...files };
    for (const [k, v] of Object.entries(o.savedSnapshot)) {
      if (Object.hasOwn(files, k)) savedSnapshot[k] = v;
    }
  } else {
    savedSnapshot = { ...files };
  }
  let activeFile = typeof o.activeFile === "string" ? o.activeFile : "";
  if (!Object.hasOwn(files, activeFile)) {
    const keys = Object.keys(files);
    activeFile = keys.sort()[0] ?? "";
  }
  const openRaw = Array.isArray(o.openEditorTabs)
    ? o.openEditorTabs.filter((p): p is string => typeof p === "string")
    : [];
  const draft: TextWorkspaceV1 = {
    version: 1,
    files,
    savedSnapshot,
    savedPaths: isRecordOfStrings(o.savedPaths) ? o.savedPaths : {},
    activeFile,
    openEditorTabs: openRaw,
  };
  draft.openEditorTabs = normalizeOpenEditorTabs(draft);
  if (!Object.hasOwn(draft.files, draft.activeFile)) {
    const k = Object.keys(draft.files).sort()[0];
    draft.activeFile = k ?? "";
  }
  return draft;
}

function loadPersistedWorkspace(options: TextFileWorkspaceOptions): TextWorkspaceV1 {
  if (typeof window === "undefined") return createDefaultWorkspace(options);
  try {
    const raw = localStorage.getItem(options.storageKey);
    if (!raw) return createDefaultWorkspace(options);
    const parsed = parseStoredWorkspace(raw);
    return parsed ?? createDefaultWorkspace(options);
  } catch {
    return createDefaultWorkspace(options);
  }
}

function persistWorkspace(storageKey: string, state: TextWorkspaceV1): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

function nextUntitledName(files: Record<string, string>, prefix: string, extension: string): string {
  const escapedExt = extension.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${prefix}-(\\d+)${escapedExt}$`, "i");
  let max = 0;
  for (const k of Object.keys(files)) {
    const m = k.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${max + 1}${extension}`;
}

function uniqueFileName(files: Record<string, string>, desired: string, current?: string): string {
  if (desired === current) return desired;
  if (!Object.hasOwn(files, desired)) return desired;
  const extIndex = desired.lastIndexOf(".");
  const hasExt = extIndex > 0;
  const stem = hasExt ? desired.slice(0, extIndex) : desired;
  const ext = hasExt ? desired.slice(extIndex) : "";
  let i = 2;
  let candidate = `${stem}-${i}${ext}`;
  while (Object.hasOwn(files, candidate) && candidate !== current) {
    i += 1;
    candidate = `${stem}-${i}${ext}`;
  }
  return candidate;
}

function tabBasename(path: string) {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

function ensureDefaultExtension(name: string, extension: string) {
  return /\.[^/.]+$/.test(name) ? name : `${name}${extension}`;
}

function resolveElectronApi() {
  if (typeof window === "undefined") return undefined;
  if (window.electronApi) return window.electronApi;
  try {
    if (window.top && window.top !== window && window.top.electronApi) return window.top.electronApi;
  } catch {
    /* ignore cross-origin frame access errors */
  }
  try {
    if (window.parent && window.parent !== window && window.parent.electronApi) return window.parent.electronApi;
  } catch {
    /* ignore cross-origin frame access errors */
  }
  return undefined;
}

export function useTextFileWorkspace(options: TextFileWorkspaceOptions) {
  const [workspace, setWorkspace] = useState<TextWorkspaceV1>(() => loadPersistedWorkspace(options));
  const [pendingClosePath, setPendingClosePath] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [leftWidth, setLeftWidth] = useState(680);
  const { files, savedSnapshot, activeFile, openEditorTabs } = workspace;
  const activeContent = files[activeFile] ?? "";

  useEffect(() => {
    const t = window.setTimeout(() => {
      persistWorkspace(options.storageKey, workspace);
    }, PERSIST_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [options.storageKey, workspace]);

  const updateActiveContent = useCallback((next: string) => {
    setWorkspace((prev) => ({
      ...prev,
      files: { ...prev.files, [prev.activeFile]: next },
    }));
  }, []);

  const hasUnsavedChanges = useCallback(
    (path: string) => (files[path] ?? "") !== (savedSnapshot[path] ?? ""),
    [files, savedSnapshot],
  );

  const selectFile = useCallback((path: string) => {
    setWorkspace((prev) => {
      if (!Object.hasOwn(prev.files, path)) return prev;
      return { ...prev, activeFile: path };
    });
  }, []);

  const closeEditorTab = useCallback((path: string, allowClosingLastTab = false) => {
    setWorkspace((prev) => {
      if (prev.openEditorTabs.length <= 1 && !allowClosingLastTab) return prev;
      const filesRest = { ...prev.files };
      delete filesRest[path];
      const snapRest = { ...prev.savedSnapshot };
      delete snapRest[path];
      const savedPathsRest = { ...(prev.savedPaths ?? {}) };
      delete savedPathsRest[path];
      const nextTabs = prev.openEditorTabs.filter((p) => p !== path);
      const tabsInWorkspace = nextTabs.filter((p) => Object.hasOwn(filesRest, p));
      const finalTabs = tabsInWorkspace.length > 0 ? tabsInWorkspace : Object.keys(filesRest).sort();
      let nextActive = prev.activeFile;
      if (prev.activeFile === path) {
        const idx = prev.openEditorTabs.indexOf(path);
        nextActive = prev.openEditorTabs[idx - 1] ?? prev.openEditorTabs[idx + 1] ?? finalTabs[0] ?? prev.activeFile;
      }
      if (!Object.hasOwn(filesRest, nextActive)) {
        nextActive = finalTabs[0] ?? Object.keys(filesRest).sort()[0] ?? "";
      }
      return {
        ...prev,
        files: filesRest,
        savedSnapshot: snapRest,
        savedPaths: savedPathsRest,
        openEditorTabs: finalTabs.length > 0 ? finalTabs : [],
        activeFile: nextActive,
      };
    });
  }, []);

  const requestCloseTab = useCallback(
    (path: string) => {
      if (hasUnsavedChanges(path)) {
        setPendingClosePath(path);
        return;
      }
      closeEditorTab(path, true);
    },
    [hasUnsavedChanges, closeEditorTab],
  );

  const cancelCloseDialog = useCallback(() => setPendingClosePath(null), []);

  const confirmDiscardClose = useCallback(() => {
    const path = pendingClosePath;
    if (!path) return;
    setPendingClosePath(null);
    closeEditorTab(path, true);
  }, [pendingClosePath, closeEditorTab]);

  useEffect(() => {
    if (!pendingClosePath) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPendingClosePath(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingClosePath]);

  const saveActiveFile = useCallback(async () => {
    if (!activeFile || !Object.hasOwn(files, activeFile)) return;
    setSaveError(null);
    const fileToSave = activeFile;
    const contentToSave = files[fileToSave] ?? "";
    const api = resolveElectronApi();
    let savedPath = workspace.savedPaths?.[fileToSave];

    if (api && !api.saveTextWithDialog) {
      setSaveError(options.saveUnavailableMessage);
      return;
    }

    if (api?.saveTextWithDialog) {
      const filename = tabBasename(fileToSave);
      const defaultFilename = ensureDefaultExtension(filename, options.defaultExtension);
      const result = await api.saveTextWithDialog(contentToSave, defaultFilename, savedPath);
      if (!result.ok) {
        const failure = result as { ok: false; canceled?: boolean; error?: string };
        if (!failure.canceled) {
          setSaveError(failure.error ?? "Unable to save file.");
        }
        return;
      }
      savedPath = result.path;
    }

    setWorkspace((prev) => {
      const tabPath = fileToSave;
      const absoluteSavedPath = savedPath;
      const normalizedSavedName = absoluteSavedPath ? absoluteSavedPath.split(/[\\/]/).pop() || tabPath : tabPath;
      const nextTabPath = uniqueFileName(prev.files, normalizedSavedName, tabPath);

      const nextFiles = { ...prev.files };
      const sourceContent = nextFiles[tabPath] ?? "";
      delete nextFiles[tabPath];
      nextFiles[nextTabPath] = sourceContent;

      const nextSavedSnapshot = { ...prev.savedSnapshot };
      delete nextSavedSnapshot[tabPath];
      nextSavedSnapshot[nextTabPath] = sourceContent;

      const nextSavedPaths = { ...(prev.savedPaths ?? {}) };
      delete nextSavedPaths[tabPath];

      const next: TextWorkspaceV1 = {
        ...prev,
        files: nextFiles,
        savedSnapshot: nextSavedSnapshot,
        openEditorTabs: prev.openEditorTabs.map((p) => (p === tabPath ? nextTabPath : p)),
        activeFile: prev.activeFile === tabPath ? nextTabPath : prev.activeFile,
      };
      if (savedPath) {
        nextSavedPaths[nextTabPath] = savedPath;
      }
      next.savedPaths = nextSavedPaths;
      persistWorkspace(options.storageKey, next);
      return next;
    });
  }, [activeFile, files, options.defaultExtension, options.saveUnavailableMessage, options.storageKey, workspace.savedPaths]);

  const renameTab = useCallback(
    (fromPath: string) => {
      const currentName = tabBasename(fromPath);
      const suggested = currentName.replace(/\.[^/.]+$/i, "");
      const entered = window.prompt("New file name", suggested);
      if (!entered) return;
      const base = entered.trim();
      if (!base) return;
      const nextName = ensureDefaultExtension(base, options.defaultExtension);
      setWorkspace((prev) => {
        if (nextName === fromPath || Object.hasOwn(prev.files, nextName)) return prev;
        const content = prev.files[fromPath];
        if (content === undefined) return prev;
        const nextFiles = { ...prev.files };
        delete nextFiles[fromPath];
        nextFiles[nextName] = content;
        const nextSnapshot = { ...prev.savedSnapshot };
        const oldSnapshot = nextSnapshot[fromPath];
        delete nextSnapshot[fromPath];
        nextSnapshot[nextName] = oldSnapshot ?? content;
        const nextSavedPaths = { ...(prev.savedPaths ?? {}) };
        const oldSavedPath = nextSavedPaths[fromPath];
        delete nextSavedPaths[fromPath];
        if (oldSavedPath) nextSavedPaths[nextName] = oldSavedPath;
        return {
          ...prev,
          files: nextFiles,
          savedSnapshot: nextSnapshot,
          savedPaths: nextSavedPaths,
          activeFile: prev.activeFile === fromPath ? nextName : prev.activeFile,
          openEditorTabs: prev.openEditorTabs.map((p) => (p === fromPath ? nextName : p)),
        };
      });
    },
    [options.defaultExtension],
  );

  const addNewFile = useCallback(() => {
    setWorkspace((prev) => {
      const name = nextUntitledName(prev.files, options.untitledPrefix, options.defaultExtension);
      return {
        ...prev,
        files: { ...prev.files, [name]: "" },
        savedSnapshot: { ...prev.savedSnapshot, [name]: "" },
        activeFile: name,
        openEditorTabs: [...prev.openEditorTabs, name],
      };
    });
  }, [options.defaultExtension, options.untitledPrefix]);

  const openTextFile = useCallback(async () => {
    setSaveError(null);
    const api = resolveElectronApi();
    if (!api) {
      setSaveError("Open file requires the Electron desktop app.");
      return;
    }
    if (!api.openTextWithDialog) {
      setSaveError(options.openUnavailableMessage);
      return;
    }
    const result = await api.openTextWithDialog();
    if (!result.ok) {
      const failure = result as { ok: false; canceled?: boolean; error?: string };
      if (!failure.canceled) {
        setSaveError(failure.error ?? "Unable to open file.");
      }
      return;
    }
    const openedName = result.path.split(/[\\/]/).pop() || ensureDefaultExtension("opened", options.defaultExtension);
    setWorkspace((prev) => {
      const existing = Object.entries(prev.savedPaths ?? {}).find(([, p]) => p === result.path)?.[0];
      if (existing && Object.hasOwn(prev.files, existing)) {
        return { ...prev, activeFile: existing };
      }
      const tabName = uniqueFileName(prev.files, openedName);
      return {
        ...prev,
        files: { ...prev.files, [tabName]: result.content },
        savedSnapshot: { ...prev.savedSnapshot, [tabName]: result.content },
        savedPaths: { ...(prev.savedPaths ?? {}), [tabName]: result.path },
        activeFile: tabName,
        openEditorTabs: prev.openEditorTabs.includes(tabName) ? prev.openEditorTabs : [...prev.openEditorTabs, tabName],
      };
    });
  }, [options.defaultExtension, options.openUnavailableMessage]);

  const startHorizontalDrag = useCallback(() => {
    const onMove = (event: MouseEvent) => {
      const width = window.innerWidth;
      setLeftWidth(Math.max(420, Math.min(width - 420, event.clientX)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  return useMemo(
    () => ({
      files,
      savedSnapshot,
      activeFile,
      activeContent,
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
      getTabBasename: tabBasename,
    }),
    [
      files,
      savedSnapshot,
      activeFile,
      activeContent,
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
    ],
  );
}
