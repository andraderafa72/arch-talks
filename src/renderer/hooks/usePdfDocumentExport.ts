import { useCallback, useState } from "react";

function resolveElectronApi() {
  if (typeof window === "undefined") return undefined;
  if (window.electronApi) return window.electronApi;
  try {
    if (window.top && window.top !== window && window.top.electronApi) return window.top.electronApi;
  } catch {
    // Ignore cross-origin frame access errors.
  }
  try {
    if (window.parent && window.parent !== window && window.parent.electronApi) return window.parent.electronApi;
  } catch {
    // Ignore cross-origin frame access errors.
  }
  return undefined;
}

type ExportPdfOptions = {
  filename?: string;
  beforePrint?: () => Promise<void> | void;
  afterPrint?: () => Promise<void> | void;
};

export function usePdfDocumentExport() {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportPdf = useCallback(async (options: ExportPdfOptions = {}) => {
    const api = resolveElectronApi();
    const isElectronRuntime = typeof navigator !== "undefined" && /Electron/i.test(navigator.userAgent);
    if (!api) {
      setExportError(
        isElectronRuntime
          ? "Electron detected, but preload bridge is unavailable. Restart the desktop app to reload preload.ts."
          : "PDF export requires the Electron desktop app.",
      );
      return;
    }
    if (!api.savePdfWithDialog) {
      setExportError("Electron bridge loaded, but savePdfWithDialog is unavailable. Restart the desktop app.");
      return;
    }
    if (!api.printCurrentWebContentsToPdf) {
      setExportError("Electron app detected, but PDF bridge is outdated. Restart the desktop app to load the new preload.");
      return;
    }

    setExporting(true);
    setExportError(null);

    try {
      await options.beforePrint?.();
      const rendered = await api.printCurrentWebContentsToPdf();
      if (rendered.ok !== true) {
        throw new Error(rendered.error || "Failed to render PDF.");
      }
      const result = await api.savePdfWithDialog(rendered.data, options.filename ?? "document.pdf");
      if (result.ok === false && !result.canceled && result.error) {
        setExportError(result.error);
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : String(error));
      console.error(error);
    } finally {
      await options.afterPrint?.();
      setExporting(false);
    }
  }, []);

  return { exportPdf, exporting, exportError, setExportError };
}

