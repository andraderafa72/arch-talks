import type { ChatStore } from "@/persistence/ports/chatStore";
import type { ConversationDocumentStore } from "@/persistence/ports/conversationDocumentStore";
import type { TemplateStore } from "@/persistence/ports/templateStore";

export interface PersistenceProvider {
  conversations: ConversationDocumentStore;
  templates: TemplateStore;
  chats: ChatStore;
}
