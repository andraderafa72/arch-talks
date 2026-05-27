import type { DailyReportBlockSpec, DailyReportSummary } from "./dailyReportTypes.ts";

export function parseBlockSpec(raw: unknown): DailyReportBlockSpec | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const row = raw as Record<string, unknown>;
  const hours = typeof row.hours === "number" && Number.isFinite(row.hours) ? row.hours : NaN;
  const count =
    typeof row.count === "number" && Number.isFinite(row.count) ? Math.floor(row.count) : NaN;
  if (!(hours > 0) || !(count >= 1)) return undefined;
  return { hours, count };
}

export function parseTaskBlockPlan(raw: unknown): DailyReportBlockSpec[] {
  if (!Array.isArray(raw)) return [];
  const plan: DailyReportBlockSpec[] = [];
  for (const item of raw) {
    const parsed = parseBlockSpec(item);
    if (parsed) plan.push(parsed);
  }
  return plan;
}

export function blockPlanTotals(plan: DailyReportBlockSpec[]): {
  blockCount: number;
  totalHours: number;
} {
  let blockCount = 0;
  let totalHours = 0;
  for (const spec of plan) {
    blockCount += spec.count;
    totalHours += spec.hours * spec.count;
  }
  return { blockCount, totalHours };
}

/** Expands plan into per-entry expected hours (e.g. 1×2h + 7×1h → [2,1,1,1,1,1,1,1]). */
export function expandBlockPlanHours(plan: DailyReportBlockSpec[]): number[] {
  const hours: number[] = [];
  for (const spec of plan) {
    for (let i = 0; i < spec.count; i++) hours.push(spec.hours);
  }
  return hours;
}

function hoursMultisetEqual(a: number[], b: number[], tolerance = 0.01): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  for (let i = 0; i < sortedA.length; i++) {
    if (Math.abs(sortedA[i]! - sortedB[i]!) > tolerance) return false;
  }
  return true;
}

export function validateSummaryAgainstBlockPlan(
  summary: DailyReportSummary,
  plan: DailyReportBlockSpec[],
): { ok: true } | { ok: false; errors: string[] } {
  if (plan.length === 0) return { ok: true };

  const { blockCount, totalHours } = blockPlanTotals(plan);
  const expectedHours = expandBlockPlanHours(plan);
  const actualHours = summary.entries.map((e) => e.hours);

  const errors: string[] = [];

  if (summary.entries.length !== blockCount) {
    errors.push(
      `Expected ${blockCount} entries (${plan.map((s) => `${s.count}×${s.hours}h`).join(", ")}), got ${summary.entries.length}`,
    );
  }

  if (!hoursMultisetEqual(actualHours, expectedHours)) {
    const expectedLabel = plan.map((s) => `${s.count} block(s) of ${s.hours}h`).join("; ");
    errors.push(`Entry hours must match the block plan: ${expectedLabel}`);
  }

  const actualTotal = actualHours.reduce((s, h) => s + h, 0);
  if (Math.abs(actualTotal - totalHours) > 0.02) {
    errors.push(`Total hours must be ${totalHours}h, got ${actualTotal.toFixed(2)}h`);
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}

export function formatBlockPlanForPrompt(plan: DailyReportBlockSpec[]): string {
  if (plan.length === 0) return "";

  const { blockCount, totalHours } = blockPlanTotals(plan);
  const expectedHours = expandBlockPlanHours(plan);
  const hoursList = expectedHours.join(", ");

  const specsJson = JSON.stringify(
    plan.map((s) => ({ hours_per_block: s.hours, block_count: s.count })),
    null,
    2,
  );

  const slotLines = plan.map(
    (s, i) =>
      `- Slot group ${i + 1}: produce **exactly ${s.count}** YAML entry/entries, **each** with \`hours: ${s.hours}\` (not ${s.hours * s.count} in one row).`,
  );

  return `## TASK BLOCK PLAN — ABSOLUTE REQUIREMENT (READ FIRST)

THE USER HAS DEFINED A FIXED BLOCK STRUCTURE. THIS OVERRIDES EVERYTHING ELSE IN THIS CONVERSATION.

### WHAT YOU MUST PRODUCE
- **EXACTLY ${blockCount}** entries in \`dailyReportSummary.entries\` — NOT ${blockCount - 1}, NOT ${blockCount + 1}.
- **EXACTLY** these per-entry \`hours\` values (one value per entry, order does not matter for validation): **[${hoursList}]**
- **TOTAL** hours across all entries must equal **${totalHours}** (because the multiset above sums to ${totalHours}).

### WHAT YOU MUST IGNORE (EVEN IF SHOWN ELSEWHERE IN THIS PROMPT)
- **IGNORE** any "current saved task entries" or previously registered tasks for **entry count** and **hours**.
- You may reuse their **descriptions** and reassign **category_id** / **task_type_id**, but you **MUST NOT** keep their old hours or merge/split rows to match old tasks.
- **IGNORE** the user's narrative if it implies a different number of blocks or different hour splits.
- **DO NOT** "preserve", "keep", "align with", or "approximate" previously saved tasks when that conflicts with this plan.

### HOW TO MAP WORK TO SLOTS
${slotLines.join("\n")}
- Spread the user's described activities across the ${blockCount} entries. Each entry needs its own description, category_id, and task_type_id.
- If the user mentions fewer activities than ${blockCount}, split one activity across multiple entries or add plausible distinct sub-tasks until you have ${blockCount} entries — **without changing any entry's hours** from the required multiset.

### MACHINE-READABLE PLAN
\`\`\`json
${specsJson}
\`\`\`

### IF YOU VIOLATE THIS PLAN
Your YAML will be **rejected**. Output ${blockCount} entries with the exact hours multiset above anyway; only descriptions and taxonomy ids may be best-effort.`;
}
