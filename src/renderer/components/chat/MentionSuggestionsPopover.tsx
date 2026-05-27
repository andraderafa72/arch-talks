import { cn } from "@/lib/utils";
import type { MentionSuggestion } from "@/lib/mentionTokens";

type MentionSuggestionsPopoverProps = {
  open: boolean;
  suggestions: MentionSuggestion[];
  activeIndex: number;
  onSelect: (suggestion: MentionSuggestion) => void;
  className?: string;
};

export function MentionSuggestionsPopover({
  open,
  suggestions,
  activeIndex,
  onSelect,
  className,
}: MentionSuggestionsPopoverProps) {
  if (!open || suggestions.length === 0) return null;

  let lastGroup: string | null = null;

  return (
    <div
      className={cn(
        "absolute bottom-full left-0 z-50 mb-1 max-h-48 w-full min-w-[16rem] overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900",
        className,
      )}
      role="listbox"
    >
      {suggestions.map((suggestion, index) => {
        const showGroup = suggestion.group !== lastGroup;
        lastGroup = suggestion.group;
        return (
          <div key={suggestion.token}>
            {showGroup ? (
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {suggestion.group}
              </div>
            ) : null}
            <button
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                "flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm",
                index === activeIndex
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60",
              )}
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(suggestion);
              }}
            >
              <span className="truncate font-mono text-xs">{suggestion.label}</span>
              {suggestion.isDirectory ? (
                <span className="ml-auto shrink-0 text-[10px] text-zinc-400">folder</span>
              ) : null}
            </button>
          </div>
        );
      })}
    </div>
  );
}
