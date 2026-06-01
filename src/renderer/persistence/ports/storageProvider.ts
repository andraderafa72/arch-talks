import type { ChatStore } from "@/persistence/ports/chatStore";
import type { ConversationDocumentStore } from "@/persistence/ports/conversationDocumentStore";
import type { TemplateStore } from "@/persistence/ports/templateStore";
import type { UiThemeStore } from "@/persistence/ports/uiThemeStore";

export interface PersistenceProvider {
  conversations: ConversationDocumentStore;
  templates: TemplateStore;
  chats: ChatStore;
  uiThemes: UiThemeStore;
}
