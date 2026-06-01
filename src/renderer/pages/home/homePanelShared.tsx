import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function TabPanelIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-[var(--ui-panel-border)] bg-[var(--ui-header-btn-active-bg)] p-4">
      <h2 className="text-base font-semibold text-[var(--ui-shell-fg)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--ui-muted-fg)]">{description}</p>
    </div>
  );
}

export const homeOptionButtonClass = (active: boolean) =>
  cn(
    "rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-panel-border)]",
    active
      ? "border-[var(--ui-shell-fg)] bg-[var(--ui-header-btn-active-bg)] shadow-sm"
      : "border-[var(--ui-panel-border)] bg-[var(--ui-panel-bg)] hover:bg-[var(--ui-header-btn-hover-bg)]",
  );

export function FolderBrowseButton({
  label,
  selectedPath,
  emptyHint,
  onBrowse,
}: {
  label: string;
  selectedPath: string;
  emptyHint: string;
  onBrowse: () => void;
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onBrowse}
        className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-[var(--ui-panel-border)] bg-[var(--ui-header-btn-active-bg)] px-4 py-3 text-sm font-medium text-[var(--ui-shell-fg)] transition-colors hover:border-[var(--ui-muted-fg)] hover:bg-[var(--ui-header-btn-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-panel-border)]"
      >
        <FolderOpen className="h-4 w-4 shrink-0" aria-hidden />
        {label}
      </button>
      {selectedPath ? (
        <p
          className="rounded-md border border-[var(--ui-panel-border)] bg-[var(--ui-panel-bg)] px-3 py-2 font-mono text-xs leading-relaxed text-[var(--ui-shell-fg)] break-all"
          title={selectedPath}
        >
          {selectedPath}
        </p>
      ) : (
        <p className="text-xs text-[var(--ui-muted-fg)]">{emptyHint}</p>
      )}
    </div>
  );
}
