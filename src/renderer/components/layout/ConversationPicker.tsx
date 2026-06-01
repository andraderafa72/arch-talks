import { useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceListItem } from "@/components/workspace/WorkspaceListItem";
import { topBarStrings } from "@/lib/uiCopy";
import { cn } from "@/lib/utils";
import type { Conversation, TechnicalTemplate, UiLocale } from "@/types";
import { ConversationKindIcon } from "@/components/workspace/ConversationKindIcon";
import { ChevronDown } from "lucide-react";

type ConversationPickerProps = {
  conversations: Conversation[];
  selectedConversationId?: string;
  isPlaceholder: boolean;
  placeholderLabel: string;
  templates: TechnicalTemplate[];
  locale: UiLocale;
  onSelect: (id: string) => void;
};

export function ConversationPicker({
  conversations,
  selectedConversationId,
  isPlaceholder,
  placeholderLabel,
  templates,
  locale,
  onSelect,
}: ConversationPickerProps) {
  const t = topBarStrings(locale);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selectedConversation = useMemo(
    () =>
      selectedConversationId
        ? conversations.find((conversation) => conversation.id === selectedConversationId)
        : undefined,
    [conversations, selectedConversationId],
  );

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (event: MouseEvent) => {
      const el = wrapRef.current;
      if (el && !el.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const triggerLabel = isPlaceholder ? placeholderLabel : (selectedConversation?.title ?? placeholderLabel);
  const triggerKind = isPlaceholder ? undefined : selectedConversation?.kind;

  return (
    <div ref={wrapRef} className="relative z-[100] min-w-0 shrink">
      <button
        type="button"
        className={cn(
          "inline-flex h-9 min-w-0 max-w-[10rem] items-center gap-2 rounded-md border border-[var(--ui-header-btn-border)] bg-[var(--ui-header-btn-bg)] px-2.5 text-sm text-[var(--ui-header-btn-fg)] transition-colors hover:bg-[var(--ui-header-btn-hover-bg)] sm:max-w-[14rem]",
          open &&
            "border-[var(--ui-header-btn-active-border)] bg-[var(--ui-header-btn-active-bg)] text-[var(--ui-header-btn-active-fg)]",
          (isPlaceholder || conversations.length === 0) && "text-[var(--ui-popover-muted-fg)]",
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t.projectPickerLabel}
        disabled={conversations.length === 0}
        onClick={() => {
          if (conversations.length === 0) return;
          setOpen((value) => !value);
        }}
      >
        {triggerKind ? (
          <ConversationKindIcon
            kind={triggerKind}
            className="h-3.5 w-3.5 shrink-0 text-[var(--ui-popover-muted-fg)]"
          />
        ) : null}
        <span className="min-w-0 truncate">{triggerLabel}</span>
        <ChevronDown
          className={cn("ml-auto h-4 w-4 shrink-0 opacity-70 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          className="absolute left-0 top-full z-[200] mt-1 w-[min(22rem,calc(100vw-1.5rem))] rounded-md border border-[var(--ui-popover-border)] bg-[var(--ui-popover-bg)] text-[var(--ui-popover-fg)] shadow-lg"
          role="listbox"
          aria-label={t.projectPickerLabel}
        >
          <div className="max-h-80 overflow-y-auto overscroll-contain p-1">
            {conversations.map((conversation) => (
              <WorkspaceListItem
                key={conversation.id}
                conversation={conversation}
                templates={templates}
                locale={locale}
                isActive={!isPlaceholder && conversation.id === selectedConversationId}
                activeLabel={locale === "pt" ? "Ativo" : "Active"}
                variant="compact"
                onSelect={() => {
                  onSelect(conversation.id);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
