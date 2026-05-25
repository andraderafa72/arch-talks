import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  UML_PREVIEW_MAX_ZOOM,
  UML_PREVIEW_MIN_ZOOM,
  UML_PREVIEW_ZOOM_STEP,
  clampUmlPreviewZoom,
} from "@/lib/umlPreviewZoom";
import { cn } from "@/lib/utils";

export type UmlDiagramPreviewProps = {
  src: string;
  alt: string;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  className?: string;
};

export function UmlDiagramPreview({ src, alt, zoom, onZoomChange, className }: UmlDiagramPreviewProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  const setZoom = useCallback(
    (next: number | ((current: number) => number)) => {
      const resolved = typeof next === "function" ? next(zoom) : next;
      onZoomChange(clampUmlPreviewZoom(resolved));
    },
    [onZoomChange, zoom],
  );

  const zoomIn = useCallback(() => setZoom((current) => current + UML_PREVIEW_ZOOM_STEP), [setZoom]);
  const zoomOut = useCallback(() => setZoom((current) => current - UML_PREVIEW_ZOOM_STEP), [setZoom]);

  const resetZoom = useCallback(() => {
    onZoomChange(1);
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    }
  }, [onZoomChange]);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const delta = event.deltaY > 0 ? -UML_PREVIEW_ZOOM_STEP : UML_PREVIEW_ZOOM_STEP;
      setZoom((current) => current + delta);
    },
    [setZoom],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (zoom <= 1 || event.button !== 0) return;
      const viewport = viewportRef.current;
      if (!viewport) return;
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
      };
      viewport.setPointerCapture(event.pointerId);
    },
    [zoom],
  );

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag || !viewport || drag.pointerId !== event.pointerId) return;
    viewport.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
    viewport.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
  }, []);

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    viewport?.releasePointerCapture(event.pointerId);
  }, []);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-2", className)}>
      <div className="flex shrink-0 items-center justify-center gap-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={zoomOut}
          disabled={zoom <= UML_PREVIEW_MIN_ZOOM}
          aria-label="Diminuir zoom"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="min-w-14 text-center text-xs tabular-nums text-[var(--ui-uml-preview-toolbar-fg)]">
          {zoomPercent}%
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={zoomIn}
          disabled={zoom >= UML_PREVIEW_MAX_ZOOM}
          aria-label="Aumentar zoom"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={resetZoom}
          disabled={zoom === 1}
          aria-label="Restaurar zoom"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <span className="ml-1 hidden text-xs text-[var(--ui-uml-preview-muted-fg)] sm:inline">
          Ctrl + scroll para zoom
        </span>
      </div>
      <div
        ref={viewportRef}
        className={cn(
          "min-h-0 flex-1 overflow-auto rounded-md border border-[var(--ui-uml-preview-canvas-border)] bg-[var(--ui-uml-preview-canvas-bg)] p-2",
          zoom > 1 ? "cursor-grab active:cursor-grabbing" : "",
        )}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="flex justify-center">
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="rounded border border-[var(--ui-uml-preview-image-border)]"
            style={{
              width: `${zoom * 100}%`,
              maxWidth: zoom <= 1 ? "100%" : "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}
