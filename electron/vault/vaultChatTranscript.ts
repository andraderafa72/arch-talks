export type VaultChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export function normalizeVaultChatMessages(messages: unknown, fallbackPrompt: string): VaultChatMessage[] {
  if (!Array.isArray(messages)) {
    const trimmed = fallbackPrompt.trim();
    return trimmed ? [{ role: "user", content: trimmed }] : [];
  }

  const out: VaultChatMessage[] = [];
  for (const entry of messages) {
    if (!entry || typeof entry !== "object") continue;
    const role = (entry as { role?: unknown }).role;
    const content = (entry as { content?: unknown }).content;
    if (typeof content !== "string" || !content.trim()) continue;
    if (role === "user" || role === "assistant" || role === "system") {
      out.push({ role, content: content.trim() });
    }
  }

  if (out.length > 0) return out;

  const trimmed = fallbackPrompt.trim();
  return trimmed ? [{ role: "user", content: trimmed }] : [];
}

export function formatVaultChatTranscript(messages: VaultChatMessage[]): string {
  return messages
    .filter((message) => message.content.trim().length > 0)
    .map((message) => {
      const label =
        message.role === "assistant" ? "Assistant" : message.role === "system" ? "System" : "User";
      return `${label}: ${message.content.trim()}`;
    })
    .join("\n\n");
}

export function buildVaultSourceText(transcript: string, referenceExcerpt?: string): string {
  const parts: string[] = [];
  const trimmedTranscript = transcript.trim();
  if (trimmedTranscript) {
    parts.push(trimmedTranscript);
  }
  const trimmedExcerpt = referenceExcerpt?.trim();
  if (trimmedExcerpt) {
    parts.push(`## Reference folder excerpt\n${trimmedExcerpt}`);
  }
  return parts.join("\n\n---\n\n");
}

/** Include prior turns when the runtime session has no history yet (e.g. after reload). */
export function buildVaultChatTurnPrompt(userPrompt: string, messages: VaultChatMessage[]): string {
  const latest = userPrompt.trim();
  if (!latest) return "";

  const prior = messages.slice(0, -1).filter((message) => message.role === "user" || message.role === "assistant");
  if (prior.length === 0) return latest;

  const transcript = formatVaultChatTranscript(prior);
  if (!transcript.trim()) return latest;

  return `## Conversation so far\n${transcript}\n\n## Latest user message\n${latest}`;
}
