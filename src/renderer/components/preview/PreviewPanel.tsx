import { useCallback } from "react";
import { MarkdownMath } from "@/components/markdown/MarkdownMath";
import { UmlDiagramPreview } from "@/components/preview/UmlDiagramPreview";
import { Button } from "@/components/ui/button";
import { usePlantUmlPreview } from "@/hooks/usePlantUmlPreview";
import { getUmlPreviewZoom } from "@/lib/umlPreviewZoom";
import { useEditorStore } from "@/state/store";

type PreviewPanelProps = {
  activeFile: string;
  /** Editor buffer for the active file (Markdown + math for documents; PlantUML when `.puml`). */
  documentContent: string;
  /** Save Kroki-rendered PNG into the active chat workspace (Electron). */
  canSavePngToChat?: boolean;
  onSaveRenderedPng?: (dataUrl: string) => void;
};

function isMarkdownFilename(file: string): boolean {
  const lower = file.toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".markdown") || lower.endsWith(".mdx");
}

export function PreviewPanel({
  activeFile,
  documentContent,
  canSavePngToChat,
  onSaveRenderedPng,
}: PreviewPanelProps) {
  const isUmlFile = activeFile.endsWith(".puml");
  const isMarkdownPreview = isMarkdownFilename(activeFile);
  const { previewUrl, lastBlob, loading, error } = usePlantUmlPreview(documentContent, { enabled: isUmlFile });
  const umlPreviewZoom = useEditorStore((state) => {
    const conversation = state.conversations[state.activeConversationId];
    return getUmlPreviewZoom(conversation?.umlPreviewZoom, activeFile);
  });
  const setUmlPreviewZoom = useEditorStore((state) => state.setUmlPreviewZoom);

  const handleZoomChange = useCallback(
    (zoom: number) => setUmlPreviewZoom(activeFile, zoom),
    [activeFile, setUmlPreviewZoom],
  );

  const handleSavePngToChat = useCallback(() => {
    if (!lastBlob || !onSaveRenderedPng) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") onSaveRenderedPng(result);
    };
    reader.readAsDataURL(lastBlob);
  }, [lastBlob, onSaveRenderedPng]);

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-zinc-200 bg-[#fefefe] dark:border-zinc-700 dark:bg-zinc-950">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-[#fefefe] px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950">
        <span className="text-sm font-semibold">Preview</span>
        {isUmlFile && canSavePngToChat && onSaveRenderedPng ? (
          <Button type="button" size="sm" disabled={!lastBlob} onClick={handleSavePngToChat}>
            Save PNG to chat
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 p-2">
        {isUmlFile ? (
          <div className="flex h-full min-h-0 flex-col gap-2 rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{activeFile}</div>
            <div className="flex min-h-0 flex-1 flex-col">
              {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
              {!error && documentContent.trim() && loading ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Rendering…</p>
              ) : null}
              {!error && previewUrl ? (
                <UmlDiagramPreview
                  src={previewUrl}
                  alt={activeFile}
                  zoom={umlPreviewZoom}
                  onZoomChange={handleZoomChange}
                />
              ) : null}
              {!documentContent.trim() && !error ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Empty diagram source.</p>
              ) : null}
            </div>
          </div>
        ) : isMarkdownPreview ? (
          <div className="h-full min-h-0 overflow-auto rounded-md border border-zinc-200 p-2 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
            <MarkdownMath content={documentContent} tone="document" />
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-2 rounded-md border border-zinc-200 p-2 text-sm dark:border-zinc-700">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{activeFile}</div>
            <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-zinc-900 dark:text-zinc-100">
              {documentContent || ""}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
