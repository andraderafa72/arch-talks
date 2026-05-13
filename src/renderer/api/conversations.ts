import { ConversationPersistenceService } from "@/persistence/services/conversationPersistenceService";
import { mapApiConversation, type ApiConversationRow } from "@/api/mappers";
import type { Conversation } from "@/types";

const conversationService = new ConversationPersistenceService();

export async function listConversations(baseUrl?: string): Promise<Conversation[]> {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}/api/conversations`);
    if (!response.ok) throw new Error(`Failed to load conversations (${response.status})`);
    const rows = (await response.json()) as ApiConversationRow[];
    return Array.isArray(rows) ? rows.map(mapApiConversation) : [];
  }
  return conversationService.listConversations();
}
