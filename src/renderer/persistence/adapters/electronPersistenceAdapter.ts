import type { ApiConversationRow, ApiTemplateRow } from "@/api/mappers";
import type { ChatDetail } from "@/types";
import type { ChatStore } from "@/persistence/ports/chatStore";
import type {
  ConversationDocumentMeta,
  ConversationDocumentStore,
} from "@/persistence/ports/conversationDocumentStore";
import type { PersistenceProvider } from "@/persistence/ports/storageProvider";
import type { TemplateStore } from "@/persistence/ports/templateStore";
import type { UiThemeStore } from "@/persistence/ports/uiThemeStore";
import { parseCustomUiThemes } from "@/lib/themeRegistry";
import type { UiThemeV1 } from "@/types/uiTheme";

class ElectronConversationDocumentStore implements ConversationDocumentStore {
  async listConversationRows(): Promise<ApiConversationRow[]> {
    const doc = await window.electronApi!.readArchitectureConversations();
    return doc.items as ApiConversationRow[];
  }

  async writeConversationDocument(
    meta: ConversationDocumentMeta,
    files: Record<string, string>,
  ): Promise<void> {
    const api = window.electronApi!;
    await Promise.all([
      api.writeDocumentFiles?.(meta.id, files),
      api.writeDocumentIndex?.(meta.id, {
        ...meta,
        fileCount: Object.keys(files).length,
      }),
    ]);
  }

  async writeAllConversationRows(rows: ApiConversationRow[]): Promise<void> {
    await window.electronApi!.writeArchitectureConversations({ items: rows });
  }
}

class ElectronTemplateStore implements TemplateStore {
  async listTemplateRows(): Promise<ApiTemplateRow[]> {
    const doc = await window.electronApi!.readArchitectureTemplates();
    return doc.items as ApiTemplateRow[];
  }

  async writeTemplateRows(rows: ApiTemplateRow[]): Promise<void> {
    await window.electronApi!.writeArchitectureTemplates({ items: rows });
  }
}

class ElectronChatStore implements ChatStore {
  async loadChat(documentId: string, chatId: string): Promise<ChatDetail> {
    const detail = await window.electronApi!.chatLoad?.(documentId, chatId);
    return {
      chatId,
      messages: Array.isArray((detail as ChatDetail | undefined)?.messages)
        ? ((detail as ChatDetail).messages ?? [])
        : [],
      history: Array.isArray((detail as ChatDetail | undefined)?.history)
        ? ((detail as ChatDetail).history ?? [])
        : [],
    };
  }

  async saveChat(documentId: string, chatId: string, detail: ChatDetail): Promise<void> {
    await window.electronApi!.chatSave?.(documentId, chatId, detail);
  }
}

class ElectronUiThemeStore implements UiThemeStore {
  private requireApi() {
    const api = window.electronApi;
    if (!api?.writeUiTheme || !api.listUiThemes || !api.deleteUiTheme) {
      throw new Error("UI theme APIs are unavailable. Restart the desktop app.");
    }
    return api;
  }

  async listThemes(): Promise<UiThemeV1[]> {
    const raw = await this.requireApi().listUiThemes();
    return parseCustomUiThemes(raw);
  }

  async writeTheme(theme: UiThemeV1): Promise<void> {
    await this.requireApi().writeUiTheme(theme);
  }

  async deleteTheme(id: string): Promise<void> {
    await this.requireApi().deleteUiTheme(id);
  }

  async migrateEmbeddedThemes(themes: UiThemeV1[]): Promise<number> {
    return this.requireApi().migrateEmbeddedUiThemes(themes);
  }
}

export function createElectronPersistenceProvider(): PersistenceProvider {
  return {
    conversations: new ElectronConversationDocumentStore(),
    templates: new ElectronTemplateStore(),
    chats: new ElectronChatStore(),
    uiThemes: new ElectronUiThemeStore(),
  };
}
