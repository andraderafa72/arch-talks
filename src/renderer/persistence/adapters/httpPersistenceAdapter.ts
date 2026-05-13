import type { ApiConversationRow, ApiTemplateRow } from "@/api/mappers";
import type { ChatDetail } from "@/types";
import type { ChatStore } from "@/persistence/ports/chatStore";
import type {
  ConversationDocumentMeta,
  ConversationDocumentStore,
} from "@/persistence/ports/conversationDocumentStore";
import type { PersistenceProvider } from "@/persistence/ports/storageProvider";
import type { CreateTemplateInput, TemplateStore } from "@/persistence/ports/templateStore";

class HttpConversationDocumentStore implements ConversationDocumentStore {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async listConversationRows(): Promise<ApiConversationRow[]> {
    const response = await fetch(`${this.baseUrl}/api/conversations`);
    if (!response.ok) throw new Error(`Failed to load conversations (${response.status})`);
    const rows = (await response.json()) as ApiConversationRow[];
    return Array.isArray(rows) ? rows : [];
  }

  async writeConversationDocument(
    meta: ConversationDocumentMeta,
    files: Record<string, string>,
  ): Promise<void> {
    void meta;
    void files;
    throw new Error("Single-document write is not supported by HTTP adapter.");
  }

  async writeAllConversationRows(rows: ApiConversationRow[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/conversations`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: rows }),
    });
    if (!response.ok) throw new Error(`Failed to save conversations (${response.status})`);
  }
}

class HttpTemplateStore implements TemplateStore {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async listTemplateRows(): Promise<ApiTemplateRow[]> {
    const response = await fetch(`${this.baseUrl}/api/templates`);
    if (!response.ok) throw new Error(`Failed to load templates (${response.status})`);
    const rows = (await response.json()) as ApiTemplateRow[];
    return Array.isArray(rows) ? rows : [];
  }

  async writeTemplateRows(rows: ApiTemplateRow[]): Promise<void> {
    void rows;
    // Backend currently has only POST for templates; keep same behavior as before.
  }

  async createTemplate(input: CreateTemplateInput): Promise<ApiTemplateRow> {
    const response = await fetch(`${this.baseUrl}/api/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string } & ApiTemplateRow;
    if (!response.ok) {
      throw new Error(payload.error ?? `Failed to create template (${response.status})`);
    }
    return payload as ApiTemplateRow;
  }
}

class HttpChatStore implements ChatStore {
  async loadChat(_documentId: string, chatId: string): Promise<ChatDetail> {
    return { chatId, messages: [], history: [] };
  }

  async saveChat(documentId: string, chatId: string, detail: ChatDetail): Promise<void> {
    void documentId;
    void chatId;
    void detail;
  }
}

export function createHttpPersistenceProvider(baseUrl: string): PersistenceProvider {
  return {
    conversations: new HttpConversationDocumentStore(baseUrl),
    templates: new HttpTemplateStore(baseUrl),
    chats: new HttpChatStore(),
  };
}
