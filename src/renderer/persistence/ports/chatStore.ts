import type { ChatDetail } from "@/types";

export interface ChatStore {
  loadChat(documentId: string, chatId: string): Promise<ChatDetail>;
  saveChat(documentId: string, chatId: string, detail: ChatDetail): Promise<void>;
}
