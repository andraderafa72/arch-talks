import {
  extractStructuredBlocks,
  extractStructuredObjectByKey,
  parseStructuredDocument,
} from "../vault/extractStructuredBlocks.ts";
import { validateSummaryAgainstBlockPlan } from "./dailyReportBlockPlan.ts";
import type {
  DailyReportBlockSpec,
  DailyReportSummary,
  DailyReportSummaryEntry,
  DailyReportTaxonomy,
} from "./dailyReportTypes.ts";

function parseSummaryEntry(raw: unknown): DailyReportSummaryEntry | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const row = raw as Record<string, unknown>;
  const hours = typeof row.hours === "number" && Number.isFinite(row.hours) ? row.hours : NaN;
  const description = typeof row.description === "string" ? row.description.trim() : "";
  const categoryId =
    typeof row.categoryId === "string"
      ? row.categoryId.trim()
      : typeof row.category_id === "string"
        ? row.category_id.trim()
        : "";
  const taskTypeId =
    typeof row.taskTypeId === "string"
      ? row.taskTypeId.trim()
      : typeof row.task_type_id === "string"
        ? row.task_type_id.trim()
        : "";
  if (!(hours > 0) || !description || !categoryId || !taskTypeId) return undefined;
  return { hours, description, categoryId, taskTypeId };
}

function parseSummaryObject(raw: unknown): DailyReportSummary | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const summaryRaw = "dailyReportSummary" in obj ? obj.dailyReportSummary : obj;
  if (!summaryRaw || typeof summaryRaw !== "object" || Array.isArray(summaryRaw)) return undefined;
  const s = summaryRaw as Record<string, unknown>;

  const entries: DailyReportSummaryEntry[] = [];
  if (Array.isArray(s.entries)) {
    for (const item of s.entries) {
      const parsed = parseSummaryEntry(item);
      if (parsed) entries.push(parsed);
    }
  }

  if (entries.length === 0) return undefined;

  const narrative = typeof s.narrative === "string" && s.narrative.trim() ? s.narrative.trim() : undefined;
  return { narrative, entries };
}

export function validateSummaryAgainstTaxonomy(
  summary: DailyReportSummary,
  taxonomy: DailyReportTaxonomy,
): { ok: true } | { ok: false; errors: string[] } {
  const categoryIds = new Set(taxonomy.categories.map((c) => c.id));
  const typeByCategory = new Map<string, Set<string>>();
  for (const t of taxonomy.taskTypes) {
    if (!typeByCategory.has(t.categoryId)) typeByCategory.set(t.categoryId, new Set());
    typeByCategory.get(t.categoryId)!.add(t.id);
  }

  const errors: string[] = [];
  for (let i = 0; i < summary.entries.length; i++) {
    const e = summary.entries[i]!;
    if (!categoryIds.has(e.categoryId)) {
      errors.push(`Entry ${i + 1}: unknown category_id "${e.categoryId}"`);
    }
    const types = typeByCategory.get(e.categoryId);
    if (!types || !types.has(e.taskTypeId)) {
      errors.push(`Entry ${i + 1}: unknown task_type_id "${e.taskTypeId}" for category "${e.categoryId}"`);
    }
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}

export function parseDailyReportSummaryFromReply(reply: string): DailyReportSummary | undefined {
  for (const block of extractStructuredBlocks(reply)) {
    const parsed = parseStructuredDocument(block);
    if (!parsed) continue;
    const summary = parseSummaryObject(parsed);
    if (summary) return summary;
  }

  const keyed = extractStructuredObjectByKey(reply, "dailyReportSummary");
  if (keyed) return parseSummaryObject(keyed);

  return undefined;
}

export function stripDailyReportSummaryFromReply(reply: string): string {
  let out = reply
    .replace(/```ya?ml\s*[\s\S]*?dailyReportSummary[\s\S]*?```/gi, "")
    .replace(/```json\s*[\s\S]*?"dailyReportSummary"[\s\S]*?```/g, "")
    .trim();
  out = out.replace(/\n{3,}/g, "\n\n").trim();
  return out;
}

export function partitionDailyReportReply(
  reply: string,
  taxonomy: DailyReportTaxonomy,
  taskBlockPlan?: DailyReportBlockSpec[],
): { reply: string; summary?: DailyReportSummary; parseError?: string } {
  const summary = parseDailyReportSummaryFromReply(reply);
  const cleanReply = stripDailyReportSummaryFromReply(reply) || reply.trim();

  if (!summary) {
    return { reply: cleanReply };
  }

  const taxonomyValidation = validateSummaryAgainstTaxonomy(summary, taxonomy);
  if (!taxonomyValidation.ok) {
    return {
      reply: cleanReply,
      parseError: taxonomyValidation.errors.join("; "),
    };
  }

  const plan = taskBlockPlan ?? [];
  if (plan.length > 0) {
    const planValidation = validateSummaryAgainstBlockPlan(summary, plan);
    if (!planValidation.ok) {
      return {
        reply: cleanReply,
        parseError: planValidation.errors.join("; "),
      };
    }
  }

  return { reply: cleanReply, summary };
}
