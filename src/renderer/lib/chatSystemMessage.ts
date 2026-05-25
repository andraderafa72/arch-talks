import type { ChatMessage, ChatSystemTone } from "@/types";

export function createSystemMessage(content: string, tone: ChatSystemTone): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "system",
    content,
    systemTone: tone,
    timestamp: new Date().toISOString(),
  };
}

/** Resolves tone for render; infers from content when missing (older persisted chats). */
export function resolveSystemTone(message: ChatMessage): ChatSystemTone {
  if (message.role !== "system") return "info";
  if (message.systemTone) return message.systemTone;
  return inferSystemToneFromContent(message.content);
}

export function inferSystemToneFromContent(content: string): ChatSystemTone {
  const text = content.trim();
  const lower = text.toLowerCase();

  if (
    /^(erros de ingestão|ingestion errors|falha ao gravar|failed to write)/i.test(text) ||
    /\b(request failed|não está disponível|is not available|not available in this)\b/i.test(lower) ||
    /^error\b/i.test(text) ||
    /\b(falha|failed):\s/i.test(text)
  ) {
    return "error";
  }

  if (
    /^(avisos de validação|validation warnings|ingestão incompleta|ingestion incomplete)/i.test(text) ||
    /\b(interrompida|generation stopped|geração interrompida)\b/i.test(lower) ||
    /\b(warning|aviso)\b/i.test(lower)
  ) {
    return "warning";
  }

  return "info";
}

export function systemMessageBubbleClass(tone: ChatSystemTone): string {
  switch (tone) {
    case "error":
      return "w-full border border-dashed border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/30 dark:text-red-200";
    case "warning":
      return "w-full border border-dashed border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/25 dark:text-amber-100";
    default:
      return "w-full border border-dashed border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-200";
  }
}

export function systemMarkdownVariant(tone: ChatSystemTone): "system-info" | "system-warning" | "system-error" {
  if (tone === "error") return "system-error";
  if (tone === "warning") return "system-warning";
  return "system-info";
}
