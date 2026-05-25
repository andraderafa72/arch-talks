import { WorkspaceListItem } from "@/components/workspace/WorkspaceListItem";
import { conversationKindLabel, conversationUpdatedAt } from "@/lib/conversationMeta";
import type { Conversation, ConversationKind, TechnicalTemplate, UiLocale } from "@/types";

type ConversationsListCopy = {
  title: string;
  subtitle: string;
  empty: string;
  filteredEmpty: string;
  activeLabel: string;
};

type ConversationsListScreenProps = {
  conversations: Conversation[];
  activeConversationId: string;
  kindFilter?: ConversationKind;
  templates: TechnicalTemplate[];
  locale: UiLocale;
  copy: ConversationsListCopy;
  onOpenConversation: (id: string) => void;
};

function sortConversationsByRecent(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => {
    const aTime = Date.parse(conversationUpdatedAt(a) ?? "") || 0;
    const bTime = Date.parse(conversationUpdatedAt(b) ?? "") || 0;
    return bTime - aTime;
  });
}

export function ConversationsListScreen({
  conversations,
  activeConversationId,
  kindFilter,
  templates,
  locale,
  copy,
  onOpenConversation,
}: ConversationsListScreenProps) {
  const filterLabel = kindFilter ? conversationKindLabel(kindFilter, locale) : undefined;
  const sortedConversations = sortConversationsByRecent(conversations);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#fefefe] dark:bg-zinc-950">
      <div className="mx-auto flex h-full w-full max-w-3xl min-h-0 flex-col px-6 py-8">
        <div className="mb-5 shrink-0">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {filterLabel ? `${copy.title} — ${filterLabel}` : copy.title}
          </h2>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-300">{copy.subtitle}</p>
          {sortedConversations.length > 0 ? (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {sortedConversations.length}{" "}
              {locale === "pt"
                ? sortedConversations.length === 1
                  ? "espaço"
                  : "espaços"
                : sortedConversations.length === 1
                  ? "workspace"
                  : "workspaces"}
            </p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
          {sortedConversations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {kindFilter ? copy.filteredEmpty.replace("{kind}", filterLabel ?? "") : copy.empty}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {sortedConversations.map((conversation) => (
                <li key={conversation.id}>
                  <WorkspaceListItem
                    conversation={conversation}
                    templates={templates}
                    locale={locale}
                    isActive={conversation.id === activeConversationId}
                    activeLabel={copy.activeLabel}
                    variant="card"
                    onSelect={() => onOpenConversation(conversation.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
