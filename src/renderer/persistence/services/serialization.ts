import type { ApiConversationRow, ApiTemplateRow } from "@/api/mappers";
import type { Conversation, TechnicalTemplate } from "@/types";

export function conversationsRecordToRows(
  conversations: Record<string, Conversation>,
  updatedAt: string,
): ApiConversationRow[] {
  return Object.values(conversations).map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    kind: conversation.kind,
    templateId: conversation.templateId,
    fileCount: Object.keys(conversation.files).length,
    updatedAt,
    files: conversation.files,
    activeFile: conversation.activeFile,
    pendingPatch: conversation.pendingPatch,
    history: conversation.history,
    chatMessages: conversation.chatMessages,
    chatTabs: conversation.chatTabs,
    activeChatTabId: conversation.activeChatTabId,
    savedSnapshot: conversation.savedSnapshot,
    openEditorTabs: conversation.openEditorTabs,
  }));
}

export function templatesToRows(templates: TechnicalTemplate[], updatedAt: string): ApiTemplateRow[] {
  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    files: template.files,
    updatedAt,
  }));
}
