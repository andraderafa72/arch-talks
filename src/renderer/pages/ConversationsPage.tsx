import { ConversationsListScreen } from "@/components/chat/ConversationsListScreen";
import { useWorkspaceConversationContext } from "@/contexts/WorkspaceConversationContext";
import { conversationsListStrings } from "@/lib/uiCopy";
import { useEditorStore } from "@/state/store";
import type { ConversationKind } from "@/types";
import { useSearchParams } from "react-router-dom";

const KIND_FILTERS = new Set<ConversationKind>(["system_design", "technical_document", "vault"]);

function parseKindFilter(value: string | null): ConversationKind | undefined {
  if (value && KIND_FILTERS.has(value as ConversationKind)) {
    return value as ConversationKind;
  }
  return undefined;
}

export function ConversationsPage() {
  const [searchParams] = useSearchParams();
  const kindFilter = parseKindFilter(searchParams.get("kind"));
  const locale = useEditorStore((state) => state.locale);
  const technicalTemplates = useEditorStore((state) => state.technicalTemplates);
  const { conversationList, activeConversationId, openConversation } = useWorkspaceConversationContext();
  const filteredConversations = kindFilter
    ? conversationList.filter((conversation) => conversation.kind === kindFilter)
    : conversationList;

  return (
    <ConversationsListScreen
      conversations={filteredConversations}
      activeConversationId={activeConversationId}
      kindFilter={kindFilter}
      templates={technicalTemplates}
      locale={locale}
      copy={conversationsListStrings(locale)}
      onOpenConversation={openConversation}
    />
  );
}
