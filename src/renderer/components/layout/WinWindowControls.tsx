import { Copy, Minus, Square, X } from "lucide-react";

type WinWindowControlsProps = {
  isMaximized: boolean;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
};

export function WinWindowControls({
  isMaximized,
  onMinimize,
  onToggleMaximize,
  onClose,
}: WinWindowControlsProps) {
  return (
    <div className="window-no-drag flex shrink-0 items-center gap-0.5 px-1.5">
      <button
        type="button"
        className="inline-flex h-7 w-8 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
        aria-label="Minimize window"
        onClick={onMinimize}
      >
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="inline-flex h-7 w-8 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
        aria-label={isMaximized ? "Restore window" : "Maximize window"}
        onClick={onToggleMaximize}
      >
        {isMaximized ? (
          <Copy className="h-3 w-3" aria-hidden="true" />
        ) : (
          <Square className="h-3 w-3" aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        className="inline-flex h-7 w-8 items-center justify-center rounded-md text-zinc-600 hover:bg-red-500 hover:text-white dark:text-zinc-300 dark:hover:bg-red-600"
        aria-label="Close window"
        onClick={onClose}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
