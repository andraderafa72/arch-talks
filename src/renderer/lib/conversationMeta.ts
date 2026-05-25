import type { Conversation, ConversationKind, TechnicalTemplate, UiLocale, VaultCategory } from "@/types";

export function vaultCategoryLabel(category: VaultCategory, locale: UiLocale): string {
  if (locale === "pt") {
    if (category === "business") return "Negócio";
    if (category === "technical") return "Técnico";
    return "Projeto";
  }
  if (category === "business") return "Business";
  if (category === "technical") return "Technical";
  return "Project";
}

export function conversationKindLabel(kind: ConversationKind, locale: UiLocale): string {
  if (locale === "pt") {
    if (kind === "uml") return "UML";
    if (kind === "vault") return "Cofre de conhecimento";
    return "LaTeX";
  }
  if (kind === "uml") return "UML";
  if (kind === "vault") return "Knowledge vault";
  return "LaTeX";
}

export function conversationKindTabPrefix(kind: ConversationKind, locale: UiLocale): string {
  if (kind === "uml") return "UML";
  if (kind === "vault") return locale === "pt" ? "Cofre" : "Vault";
  return "LaTeX";
}

export function workspaceTabTitle(
  conversation: Pick<Conversation, "kind" | "title" | "vaultName">,
  locale: UiLocale,
): string {
  const prefix = conversationKindTabPrefix(conversation.kind, locale);
  const name = conversation.title || conversation.vaultName || prefix;
  return `${prefix} - ${name}`;
}

export function conversationFileCount(conversation: Conversation): number {
  if (conversation.kind === "vault" && conversation.vaultDiskPaths?.length) {
    return conversation.vaultDiskPaths.length;
  }
  return Object.keys(conversation.files).length;
}

function collectActivityTimestamps(conversation: Conversation): number[] {
  const timestamps: number[] = [];
  for (const tab of conversation.chatTabs) {
    for (const message of tab.messages) {
      if (message.timestamp) {
        const parsed = Date.parse(message.timestamp);
        if (!Number.isNaN(parsed)) timestamps.push(parsed);
      }
    }
  }
  for (const commit of conversation.history) {
    if (commit.timestamp) {
      const parsed = Date.parse(commit.timestamp);
      if (!Number.isNaN(parsed)) timestamps.push(parsed);
    }
  }
  return timestamps;
}

export function conversationCreatedAt(conversation: Conversation): string | undefined {
  if (conversation.createdAt) return conversation.createdAt;
  const activity = collectActivityTimestamps(conversation);
  if (activity.length > 0) {
    return new Date(Math.min(...activity)).toISOString();
  }
  return conversation.updatedAt;
}

export function conversationUpdatedAt(conversation: Conversation): string | undefined {
  if (conversation.updatedAt) return conversation.updatedAt;
  const activity = collectActivityTimestamps(conversation);
  if (activity.length > 0) {
    return new Date(Math.max(...activity)).toISOString();
  }
  return undefined;
}

export function formatConversationDate(iso: string | undefined, locale: UiLocale): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function conversationTemplateName(
  conversation: Conversation,
  templates: TechnicalTemplate[],
): string | undefined {
  if (conversation.kind !== "technical_document" || !conversation.templateId) return undefined;
  return templates.find((template) => template.id === conversation.templateId)?.name;
}

export type ConversationMetaLine = {
  label: string;
  value: string;
};

export function conversationMetaLines(
  conversation: Conversation,
  templates: TechnicalTemplate[],
  locale: UiLocale,
): ConversationMetaLine[] {
  const lines: ConversationMetaLine[] = [];
  const created = formatConversationDate(conversationCreatedAt(conversation), locale);
  const updated = formatConversationDate(conversationUpdatedAt(conversation), locale);

  if (created) {
    lines.push({
      label: locale === "pt" ? "Criado" : "Created",
      value: created,
    });
  }

  if (updated && updated !== created) {
    lines.push({
      label: locale === "pt" ? "Atualizado" : "Updated",
      value: updated,
    });
  }

  const fileCount = conversationFileCount(conversation);
  lines.push({
    label: locale === "pt" ? "Ficheiros" : "Files",
    value: String(fileCount),
  });

  const chatCount = conversation.chatTabs.length;
  if (chatCount > 0) {
    lines.push({
      label: locale === "pt" ? "Chats" : "Chats",
      value: String(chatCount),
    });
  }

  const templateName = conversationTemplateName(conversation, templates);
  if (templateName) {
    lines.push({
      label: locale === "pt" ? "Modelo" : "Template",
      value: templateName,
    });
  }

  if (conversation.kind === "vault" && conversation.vaultCategory) {
    lines.push({
      label: locale === "pt" ? "Categoria" : "Category",
      value: vaultCategoryLabel(conversation.vaultCategory, locale),
    });
  }

  if (conversation.kind === "vault" && conversation.vaultRootPath) {
    lines.push({
      label: locale === "pt" ? "Pasta" : "Folder",
      value: conversation.vaultRootPath,
    });
  }

  return lines;
}
