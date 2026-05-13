import { ConversationsListScreen } from "@/components/chat/ConversationsListScreen";
import { useWorkspaceConversationContext } from "@/contexts/WorkspaceConversationContext";

export function ConversationsPage() {
  const { conversationList, activeConversationId, openConversation } = useWorkspaceConversationContext();
  return (
    <ConversationsListScreen
      conversations={conversationList}
      activeConversationId={activeConversationId}
      onOpenConversation={openConversation}
    />
  );
}
