import type { MarkdownMathTone } from "@/components/markdown/MarkdownMath";
import type { ChatSystemTone } from "@/types";

export function chatUserBubbleClass(): string {
  return "bg-[var(--ui-chat-user-bg)] text-[var(--ui-chat-user-fg)]";
}

export function chatAssistantBubbleClass(): string {
  return "bg-[var(--ui-chat-assistant-bg)] text-[var(--ui-chat-assistant-fg)]";
}

export function chatStreamingBubbleClass(): string {
  return "bg-[var(--ui-chat-streaming-bg)] text-[var(--ui-chat-streaming-fg)]";
}

export function chatSystemBubbleClass(tone: ChatSystemTone): string {
  switch (tone) {
    case "error":
      return "w-full border border-dashed border-[var(--ui-chat-system-error-border)] bg-[var(--ui-chat-system-error-bg)] text-[var(--ui-chat-system-error-fg)]";
    case "warning":
      return "w-full border border-dashed border-[var(--ui-chat-system-warning-border)] bg-[var(--ui-chat-system-warning-bg)] text-[var(--ui-chat-system-warning-fg)]";
    default:
      return "w-full border border-dashed border-[var(--ui-chat-system-info-border)] bg-[var(--ui-chat-system-info-bg)] text-[var(--ui-chat-system-info-fg)]";
  }
}

export function markdownToneRole(tone: MarkdownMathTone): string {
  if (tone === "user") return "user";
  if (tone === "assistant" || tone === "document") return "assistant";
  if (tone === "system-error") return "system-error";
  if (tone === "system-warning") return "system-warning";
  return "system-info";
}

export function chatMarkdownLinkClass(tone: MarkdownMathTone): string {
  return `text-[var(--ui-chat-md-${markdownToneRole(tone)}-link)] underline underline-offset-2 hover:opacity-90`;
}

export function chatMarkdownCodeInlineClass(tone: MarkdownMathTone): string {
  const role = markdownToneRole(tone);
  return `rounded bg-[var(--ui-chat-md-${role}-code-inline-bg)] px-1 py-0.5 font-mono text-[0.85em] text-[var(--ui-chat-md-${role}-code-inline-fg)] break-all`;
}

export function chatMarkdownCodeBlockClass(tone: MarkdownMathTone): string {
  const role = markdownToneRole(tone);
  return `mb-2 max-w-full overflow-x-auto whitespace-pre-wrap rounded-md bg-[var(--ui-chat-md-${role}-code-block-bg)] p-2 font-mono text-xs text-[var(--ui-chat-md-${role}-code-block-fg)]`;
}

export const CHAT_AI_CONTROLS_TEXTAREA_CLASS =
  "w-full resize-none rounded-md border border-[var(--ui-chat-control-input-border)] bg-[var(--ui-chat-control-input-bg)] px-3 py-2 text-sm text-[var(--ui-chat-control-input-fg)] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-chat-control-focus-ring)] disabled:opacity-60";

export function vaultUserBubbleClass(): string {
  return "bg-[var(--ui-vault-user-bg)] text-[var(--ui-vault-user-fg)]";
}

export function vaultAssistantBubbleClass(): string {
  return "bg-[var(--ui-vault-assistant-bg)] text-[var(--ui-vault-assistant-fg)]";
}

export const CHAT_AI_CONTROLS_SELECT_CLASS =
  "w-auto gap-1 border-[var(--ui-chat-control-select-border)] bg-[var(--ui-chat-control-select-bg)] text-[12px] text-[var(--ui-chat-control-select-fg)] shadow-none focus:ring-1 focus-visible:ring-[var(--ui-chat-control-focus-ring)] h-6 min-w-24 px-1.5 py-0";
