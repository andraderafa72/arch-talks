import { getPersistenceProvider } from "@/persistence/createPersistenceProvider";
import type { PersistenceProvider } from "@/persistence/ports/storageProvider";
import type { ChatDetail } from "@/types";

export class ChatPersistenceService {
  private readonly provider: PersistenceProvider;

  constructor(provider: PersistenceProvider = getPersistenceProvider()) {
    this.provider = provider;
  }

  loadChat(documentId: string, chatId: string): Promise<ChatDetail> {
    return this.provider.chats.loadChat(documentId, chatId);
  }

  saveChat(documentId: string, chatId: string, detail: ChatDetail): Promise<void> {
    return this.provider.chats.saveChat(documentId, chatId, detail);
  }
}
