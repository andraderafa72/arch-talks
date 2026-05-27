import type { DailyReportBlockSpec } from "./dailyReportTypes.ts";
import type { DailyReportTaskEntry } from "./dailyReportTypes.ts";
import { formatBlockPlanForPrompt } from "./dailyReportBlockPlan.ts";
import { formatVaultChatTranscript, type VaultChatMessage } from "../vault/vaultChatTranscript.ts";

export function dailyReportChatTurnsToVaultMessages(
  turns: { role: "user" | "assistant" | "system"; content: string }[],
): VaultChatMessage[] {
  const out: VaultChatMessage[] = [];
  for (const t of turns) {
    const c = typeof t.content === "string" ? t.content.trim() : "";
    if (!c) continue;
    if (t.role === "user" || t.role === "assistant" || t.role === "system") {
      out.push({ role: t.role, content: c });
    }
  }
  return out;
}

export function formatDailyReportTaskSnapshot(entries: DailyReportTaskEntry[]): string {
  if (!entries.length) return "(no task entries yet)";
  return entries
    .map((e, i) => {
      const parts = [
        `${i + 1}. ${e.hours}h`,
        e.description,
        `category_id: ${e.categoryId}`,
        `task_type_id: ${e.taskTypeId}`,
      ];
      return parts.join(" — ");
    })
    .join("\n");
}

export function buildDailyReportUserPrompt(options: {
  date: string;
  priorTurns: { role: "user" | "assistant" | "system"; content: string }[];
  latestUserMessage: string;
  currentEntries: DailyReportTaskEntry[];
  taskBlockPlan?: DailyReportBlockSpec[];
}): string {
  const prior = dailyReportChatTurnsToVaultMessages(options.priorTurns);
  const transcript = formatVaultChatTranscript(prior).trim();
  const latest = options.latestUserMessage.trim();
  const plan = options.taskBlockPlan ?? [];
  const hasBlockPlan = plan.length > 0;

  const parts: string[] = [];

  parts.push(`## Report date\n${options.date}`);

  if (hasBlockPlan) {
    parts.push(formatBlockPlanForPrompt(plan));
    parts.push(
      `## Registered tasks on disk (CONTEXT ONLY — DO NOT COPY STRUCTURE)
The list below is for **descriptions and taxonomy hints only**. **DO NOT** copy entry count or hours from it. The TASK BLOCK PLAN in the system message is the **only** authority for how many entries to output and each entry's \`hours\` value.

\`\`\`text
${formatDailyReportTaskSnapshot(options.currentEntries)}
\`\`\``,
    );
  } else {
    parts.push(
      `## Current saved task entries (may be empty)
Use as context for the full day. Update the YAML summary after this turn.

\`\`\`text
${formatDailyReportTaskSnapshot(options.currentEntries)}
\`\`\``,
    );
  }

  if (transcript) {
    parts.push(`## Conversation so far\n${transcript}`);
  }

  parts.push(`## Latest user message\n${latest}`);

  return parts.join("\n\n");
}
