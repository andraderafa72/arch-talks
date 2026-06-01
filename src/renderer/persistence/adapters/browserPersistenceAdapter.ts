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

const BROWSER_CONV_KEY = "rag-talks.architecture.v1.conversations";
const BROWSER_TMPL_KEY = "rag-talks.architecture.v1.templates";
const BROWSER_THEMES_KEY = "rag-talks.architecture.v1.themes";

function readDoc<T>(key: string): { items: T[] } {
  if (typeof localStorage === "undefined") return { items: [] };
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw) as { items?: T[] };
    return Array.isArray(parsed.items) ? { items: parsed.items } : { items: [] };
  } catch {
    return { items: [] };
  }
}

class BrowserConversationDocumentStore implements ConversationDocumentStore {
  async listConversationRows(): Promise<ApiConversationRow[]> {
    return readDoc<ApiConversationRow>(BROWSER_CONV_KEY).items;
  }

  async writeConversationDocument(
    meta: ConversationDocumentMeta,
    files: Record<string, string>,
  ): Promise<void> {
    const rows = readDoc<ApiConversationRow>(BROWSER_CONV_KEY).items;
    const next: ApiConversationRow[] = rows.filter((row) => row.id !== meta.id);
    next.push({
      id: meta.id,
      title: meta.title,
      kind: meta.kind,
      templateId: meta.templateId ?? null,
      updatedAt: meta.updatedAt,
      files,
      activeFile: meta.activeFile,
      pendingPatch: meta.pendingPatch,
      history: [],
      chatMessages: [],
      chatTabs: meta.chatTabs?.map((tab) => ({ id: tab.id, title: tab.title, messages: [] })),
      openChatTabIds: meta.openChatTabIds,
      activeChatTabId: meta.activeChatTabId,
      savedSnapshot: meta.savedSnapshot ?? {},
      openEditorTabs: meta.openEditorTabs ?? [],
      fileCount: Object.keys(files).length,
    });
    localStorage.setItem(BROWSER_CONV_KEY, JSON.stringify({ items: next }));
  }

  async writeAllConversationRows(rows: ApiConversationRow[]): Promise<void> {
    localStorage.setItem(BROWSER_CONV_KEY, JSON.stringify({ items: rows }));
  }
}

class BrowserTemplateStore implements TemplateStore {
  async listTemplateRows(): Promise<ApiTemplateRow[]> {
    return readDoc<ApiTemplateRow>(BROWSER_TMPL_KEY).items;
  }

  async writeTemplateRows(rows: ApiTemplateRow[]): Promise<void> {
    localStorage.setItem(BROWSER_TMPL_KEY, JSON.stringify({ items: rows }));
  }
}

class BrowserChatStore implements ChatStore {
  async loadChat(_documentId: string, chatId: string): Promise<ChatDetail> {
    return { chatId, messages: [], history: [] };
  }

  async saveChat(documentId: string, chatId: string, detail: ChatDetail): Promise<void> {
    void documentId;
    void chatId;
    void detail;
  }
}

function readThemesMap(): Record<string, UiThemeV1> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(BROWSER_THEMES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const themes = parseCustomUiThemes(Object.values(parsed));
    return Object.fromEntries(themes.map((theme) => [theme.id, theme]));
  } catch {
    return {};
  }
}

function writeThemesMap(themes: Record<string, UiThemeV1>): void {
  localStorage.setItem(BROWSER_THEMES_KEY, JSON.stringify(themes));
}

class BrowserUiThemeStore implements UiThemeStore {
  async listThemes(): Promise<UiThemeV1[]> {
    return Object.values(readThemesMap());
  }

  async writeTheme(theme: UiThemeV1): Promise<void> {
    const map = readThemesMap();
    map[theme.id] = theme;
    writeThemesMap(map);
  }

  async deleteTheme(id: string): Promise<void> {
    const map = readThemesMap();
    delete map[id];
    writeThemesMap(map);
  }

  async migrateEmbeddedThemes(themes: UiThemeV1[]): Promise<number> {
    const map = readThemesMap();
    let written = 0;
    for (const theme of themes) {
      if (map[theme.id]) continue;
      map[theme.id] = theme;
      written += 1;
    }
    if (written > 0) writeThemesMap(map);
    return written;
  }
}

export function createBrowserPersistenceProvider(): PersistenceProvider {
  return {
    conversations: new BrowserConversationDocumentStore(),
    templates: new BrowserTemplateStore(),
    chats: new BrowserChatStore(),
    uiThemes: new BrowserUiThemeStore(),
  };
}
