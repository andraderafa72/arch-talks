import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { ConversationKindIcon } from "@/components/workspace/ConversationKindIcon";
import {
  conversationKindBadgeClass,
  conversationKindIconBoxClass,
} from "@/components/workspace/conversationKindVisuals";
import {
  conversationFileCount,
  conversationKindLabel,
  conversationMetaLines,
  vaultCategoryLabel,
} from "@/lib/conversationMeta";
import { cn } from "@/lib/utils";
import type { Conversation, TechnicalTemplate, UiLocale } from "@/types";
import { Check, MessageSquare, Files } from "lucide-react";

type WorkspaceListItemProps = {
  conversation: Conversation;
  templates: TechnicalTemplate[];
  locale: UiLocale;
  isActive: boolean;
  activeLabel: string;
  variant?: "compact" | "card";
  onSelect: () => void;
};

export function WorkspaceListItem({
  conversation,
  templates,
  locale,
  isActive,
  activeLabel,
  variant = "card",
  onSelect,
}: WorkspaceListItemProps) {
  const isCard = variant === "card";
  const metaLines = conversationMetaLines(conversation, templates, locale).filter((line) => {
    if (!isCard) return true;
    const filesLabel = locale === "pt" ? "Ficheiros" : "Files";
    return line.label !== filesLabel && line.label !== "Chats";
  });
  const fileCount = conversationFileCount(conversation);
  const chatCount = conversation.chatTabs.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full gap-3 text-left transition-colors",
        isCard
          ? cn(
              "rounded-xl border p-4",
              isActive
                ? "border-zinc-300 bg-zinc-50 ring-1 ring-zinc-300 dark:border-zinc-600 dark:bg-zinc-900/60 dark:ring-zinc-600"
                : "border-zinc-200 bg-[#fefefe] hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-600 dark:hover:bg-zinc-900/40",
            )
          : cn(
              "rounded-md px-2.5 py-2",
              isActive
                ? "bg-zinc-100 dark:bg-zinc-800"
                : "hover:bg-zinc-50 dark:hover:bg-zinc-800/70",
            ),
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg border",
          conversationKindIconBoxClass(conversation.kind),
          isCard ? "h-11 w-11" : "mt-0.5 h-7 w-7",
        )}
      >
        <ConversationKindIcon kind={conversation.kind} className={isCard ? "h-5 w-5" : "h-3.5 w-3.5"} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "truncate font-medium text-zinc-900 dark:text-zinc-100",
                isCard ? "text-base" : "text-sm",
              )}
            >
              {conversation.title}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge
                className={cn(
                  "h-5 border px-1.5 text-[10px] font-semibold uppercase tracking-wide",
                  conversationKindBadgeClass(conversation.kind),
                )}
              >
                {conversationKindLabel(conversation.kind, locale)}
              </Badge>
              {isActive ? (
                <Badge className="h-5 border border-zinc-300 bg-zinc-100 px-1.5 text-[10px] font-medium text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100">
                  {activeLabel}
                </Badge>
              ) : null}
              {conversation.kind === "vault" && conversation.vaultCategory ? (
                <Badge className="h-5 border border-zinc-300 bg-zinc-50 px-1.5 text-[10px] font-medium text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200">
                  {vaultCategoryLabel(conversation.vaultCategory, locale)}
                </Badge>
              ) : null}
              {conversation.kind === "vault" && conversation.vaultName ? (
                <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">{conversation.vaultName}</span>
              ) : null}
            </div>
          </div>
          {isActive ? (
            <Check className="mt-1 h-4 w-4 shrink-0 text-zinc-700 dark:text-zinc-200" aria-hidden="true" />
          ) : null}
        </div>

        {isCard ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <StatBadge
              icon={<Files className="h-3 w-3" aria-hidden="true" />}
              label={locale === "pt" ? "Ficheiros" : "Files"}
              value={String(fileCount)}
            />
            <StatBadge
              icon={<MessageSquare className="h-3 w-3" aria-hidden="true" />}
              label={locale === "pt" ? "Chats" : "Chats"}
              value={String(chatCount)}
            />
          </div>
        ) : null}

        <dl
          className={cn(
            "grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 leading-snug text-zinc-600 dark:text-zinc-400",
            isCard ? "mt-3 text-xs" : "mt-1.5 text-[11px]",
          )}
        >
          {metaLines.map((line) => (
            <div key={`${conversation.id}-${line.label}`} className="contents">
              <dt className="whitespace-nowrap font-medium text-zinc-500 dark:text-zinc-500">{line.label}</dt>
              <dd className="truncate" title={line.value}>
                {line.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </button>
  );
}

function StatBadge({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
      {icon}
      <span className="font-medium">{value}</span>
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
    </span>
  );
}
