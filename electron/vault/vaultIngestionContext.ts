import { formatVaultChatTranscript, type VaultChatMessage } from "./vaultChatTranscript.ts";

const INGESTION_STATUS_PREFIXES = [
  "Análise:",
  "Analysis:",
  "Ingestão incompleta:",
  "Ingestion incomplete:",
  "Plano de vault pronto",
  "Vault plan ready",
  "Erros de ingestão:",
  "Ingestion errors:",
  "Avisos de validação:",
  "Validation warnings:",
];

const INGESTION_ASSISTANT_PREFIXES = [
  "Analyzed ",
  "Ready to review ",
  "Topic analysis found ",
];

export function isIngestionArtifactMessage(message: VaultChatMessage): boolean {
  const firstLine = message.content.trim().split("\n")[0]?.trim() ?? "";
  if (!firstLine) return false;

  if (message.role === "system") {
    return INGESTION_STATUS_PREFIXES.some((prefix) => firstLine.startsWith(prefix));
  }

  if (message.role === "assistant") {
    return INGESTION_ASSISTANT_PREFIXES.some((prefix) => firstLine.startsWith(prefix));
  }

  return false;
}

export function extractAlreadyIngestedTopicLines(messages: VaultChatMessage[]): string[] {
  const topics = new Set<string>();

  for (const message of messages) {
    if (!isIngestionArtifactMessage(message)) continue;
    for (const line of message.content.split("\n")) {
      const trimmed = line.trim();
      const bulletMatch = trimmed.match(/^[-•*]\s+(.+)$/);
      if (bulletMatch?.[1]) {
        topics.add(bulletMatch[1].trim());
      }
    }
  }

  return [...topics];
}

/** User knowledge only — excludes assistant/system ingestion outputs from extraction source. */
export function buildVaultIngestionSourceTranscript(messages: VaultChatMessage[]): string {
  return formatVaultChatTranscript(
    messages.filter(
      (message) =>
        message.role === "user" ||
        (message.role === "assistant" && !isIngestionArtifactMessage(message)),
    ),
  );
}

export function buildAlreadyGeneratedIngestionContext(messages: VaultChatMessage[]): string {
  const artifactMessages = messages.filter(isIngestionArtifactMessage);
  const topicLines = extractAlreadyIngestedTopicLines(messages);

  if (artifactMessages.length === 0 && topicLines.length === 0) {
    return "";
  }

  const sections: string[] = [
    "## Already generated in this chat (do not re-ingest)",
    "Prior ingestion runs in this conversation are complete. Extract only **net-new** durable knowledge from user messages.",
    "",
    "Rules:",
    "- Do not re-list topics that appear below unless the user explicitly asks to revise them.",
    "- Do not treat assistant or system ingestion summaries as new source material.",
    "- Skip vault paths that already exist in the file listing when content is already covered.",
    "- Focus on user messages after the last successful ingestion, plus any genuinely new facts.",
  ];

  if (topicLines.length > 0) {
    sections.push("", "Topics already planned or ingested:", ...topicLines.map((line) => `- ${line}`));
  }

  const statusLines = artifactMessages
    .map((message) => message.content.trim().split("\n")[0]?.trim())
    .filter((line): line is string => Boolean(line));

  if (statusLines.length > 0) {
    sections.push("", "Prior ingestion status (ignore as source):", ...statusLines.map((line) => `- ${line}`));
  }

  return sections.join("\n");
}
