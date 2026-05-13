import { FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type ToolEditorHeaderProps = {
  newLabel: string;
  openLabel: string;
  onNewFile: () => void;
  onOpenFile: () => void;
};

export function ToolEditorHeader({ newLabel, openLabel, onNewFile, onOpenFile }: ToolEditorHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-end gap-1 border-b border-zinc-200 bg-zinc-50/90 px-1 py-0.5 dark:border-zinc-700 dark:bg-zinc-900/80">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 gap-1 px-2 text-xs"
        onClick={onNewFile}
        aria-label={newLabel}
      >
        <Plus className="size-3.5" strokeWidth={2} />
        New
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 gap-1 px-2 text-xs"
        onClick={onOpenFile}
        aria-label={openLabel}
      >
        <FolderOpen className="size-3.5" strokeWidth={2} />
        Open
      </Button>
    </div>
  );
}
