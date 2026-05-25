import { mapApiConversation } from "@/api/mappers";
import { getPersistenceProvider } from "@/persistence/createPersistenceProvider";
import type { PersistenceProvider } from "@/persistence/ports/storageProvider";
import { ChatPersistenceService } from "@/persistence/services/chatPersistenceService";
import { TemplatePersistenceService } from "@/persistence/services/templatePersistenceService";
import { conversationsRecordToRows } from "@/persistence/services/serialization";
import type { Conversation, TechnicalTemplate } from "@/types";

export class ConversationPersistenceService {
  private readonly provider: PersistenceProvider;
  private readonly chatService: ChatPersistenceService;
  private readonly templateService: TemplatePersistenceService;

  constructor(
    provider = getPersistenceProvider(),
    chatService = new ChatPersistenceService(provider),
    templateService = new TemplatePersistenceService(provider),
  ) {
    this.provider = provider;
    this.chatService = chatService;
    this.templateService = templateService;
  }

  async listConversations(): Promise<Conversation[]> {
    const rows = await this.provider.conversations.listConversationRows();
    return rows.map(mapApiConversation);
  }

  async persistArchitectureState(
    conversations: Record<string, Conversation>,
    templates: TechnicalTemplate[],
  ): Promise<void> {
    const updatedAt = new Date().toISOString();
    const saveOps: Promise<unknown>[] = [];

    for (const conversation of Object.values(conversations)) {
      const activeTab =
        conversation.chatTabs.find((tab) => tab.id === conversation.activeChatTabId) ??
        conversation.chatTabs[0];

      saveOps.push(
        this.provider.conversations.writeConversationDocument(
          {
            id: conversation.id,
            title: conversation.title,
            kind: conversation.kind,
            templateId: conversation.templateId,
            createdAt: conversation.createdAt,
            activeFile: conversation.activeFile,
            pendingPatch: conversation.pendingPatch,
            savedSnapshot: conversation.savedSnapshot,
            openEditorTabs: conversation.openEditorTabs,
            chatTabs: conversation.chatTabs.map((tab) => ({ id: tab.id, title: tab.title })),
            openChatTabIds: conversation.openChatTabIds,
            activeChatTabId: conversation.activeChatTabId,
            referenceFolderPath: conversation.referenceFolderPath,
            referenceExcerpt: conversation.referenceExcerpt,
            pendingVaultProposal: conversation.pendingVaultProposal ?? null,
            vaultName: conversation.vaultName,
            vaultRootPath: conversation.vaultRootPath,
            vaultCategory: conversation.vaultCategory,
            updatedAt,
          },
          conversation.files,
        ),
      );

      if (activeTab) {
        saveOps.push(
          this.chatService.saveChat(conversation.id, activeTab.id, {
            chatId: activeTab.id,
            messages: activeTab.messages,
            history: conversation.history,
          }),
        );
      }
    }

    if (saveOps.length === 0) {
      const rows = conversationsRecordToRows(conversations, updatedAt);
      saveOps.push(this.provider.conversations.writeAllConversationRows(rows));
    }

    saveOps.push(this.templateService.writeAll(templates, updatedAt));
    await Promise.all(saveOps);
  }
}
