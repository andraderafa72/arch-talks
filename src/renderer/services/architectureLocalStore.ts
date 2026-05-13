import type { CreateTemplateInput } from "@/persistence/ports/templateStore";
import { ConversationPersistenceService } from "@/persistence/services/conversationPersistenceService";
import { TemplatePersistenceService } from "@/persistence/services/templatePersistenceService";
import type { Conversation, TechnicalTemplate } from "@/types";

const conversationService = new ConversationPersistenceService();
const templateService = new TemplatePersistenceService();

export function loadBrowserArchitectureConversations(): Conversation[] {
  // Kept for backward compatibility; browser reads now go through persistence services.
  return [];
}

export function loadBrowserArchitectureTemplates(): TechnicalTemplate[] {
  // Kept for backward compatibility; browser reads now go through persistence services.
  return [];
}

export async function persistArchitectureState(
  conversations: Record<string, Conversation>,
  templates: TechnicalTemplate[],
): Promise<void> {
  await conversationService.persistArchitectureState(conversations, templates);
}

export async function createTemplateLocal(input: CreateTemplateInput): Promise<TechnicalTemplate> {
  return templateService.createTemplate(input);
}

/** Browser-only compatibility wrapper. */
export function createTemplateBrowser(input: CreateTemplateInput): TechnicalTemplate {
  void input;
  throw new Error("Use createTemplate() for async persistence providers.");
}
