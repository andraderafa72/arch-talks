import type { ApiConversationRow } from "@/api/mappers";
import type { ChatIndexItem, ConversationKind, Patch, VaultPlanProposal } from "@/types";

export type ConversationDocumentMeta = {
  id: string;
  title: string;
  kind: ConversationKind;
  templateId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  activeFile?: string;
  pendingPatch?: Patch | null;
  savedSnapshot?: Record<string, string>;
  openEditorTabs?: string[];
  activeChatTabId?: string;
  chatTabs?: ChatIndexItem[];
  openChatTabIds?: string[];
  fileCount?: number;
  referenceFolderPath?: string;
  referenceExcerpt?: string;
  pendingVaultProposal?: VaultPlanProposal | null;
  vaultName?: string;
  vaultRootPath?: string;
  vaultCategory?: string;
};

export interface ConversationDocumentStore {
  listConversationRows(): Promise<ApiConversationRow[]>;
  writeConversationDocument(
    meta: ConversationDocumentMeta,
    files: Record<string, string>,
  ): Promise<void>;
  writeAllConversationRows(rows: ApiConversationRow[]): Promise<void>;
}
