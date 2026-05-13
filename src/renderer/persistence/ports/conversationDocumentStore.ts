import type { ApiConversationRow } from "@/api/mappers";
import type { ChatIndexItem, ConversationKind, Patch } from "@/types";

export type ConversationDocumentMeta = {
  id: string;
  title: string;
  kind: ConversationKind;
  templateId?: string | null;
  updatedAt?: string;
  activeFile?: string;
  pendingPatch?: Patch | null;
  savedSnapshot?: Record<string, string>;
  openEditorTabs?: string[];
  activeChatTabId?: string;
  chatTabs?: ChatIndexItem[];
  fileCount?: number;
};

export interface ConversationDocumentStore {
  listConversationRows(): Promise<ApiConversationRow[]>;
  writeConversationDocument(
    meta: ConversationDocumentMeta,
    files: Record<string, string>,
  ): Promise<void>;
  writeAllConversationRows(rows: ApiConversationRow[]): Promise<void>;
}
