import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_DAILY_REPORT_TAXONOMY, mergeTaxonomyWithDefaults } from "./dailyReportDefaults.ts";
import type { DailyReportCategory, DailyReportTaskType, DailyReportTaxonomy } from "./dailyReportTypes.ts";

const TAXONOMY_FILE = "daily-report-taxonomy.json";

function getTaxonomyPath(): string {
  return path.join(app.getPath("userData"), TAXONOMY_FILE);
}

async function atomicWriteUtf8(targetPath: string, contents: string): Promise<void> {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const tmp = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, contents, "utf8");
  try {
    await fs.rename(tmp, targetPath);
  } catch {
    try {
      await fs.unlink(targetPath);
    } catch {
      /* ignore */
    }
    await fs.rename(tmp, targetPath);
  }
}

function parseCategory(raw: unknown): DailyReportCategory | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const label = typeof row.label === "string" ? row.label.trim() : "";
  if (!id || !label) return undefined;
  const cat: DailyReportCategory = { id, label };
  if (typeof row.description === "string" && row.description.trim()) {
    cat.description = row.description.trim();
  }
  return cat;
}

function parseTaskType(raw: unknown): DailyReportTaskType | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const categoryId =
    typeof row.categoryId === "string"
      ? row.categoryId.trim()
      : typeof row.category_id === "string"
        ? row.category_id.trim()
        : "";
  const label = typeof row.label === "string" ? row.label.trim() : "";
  if (!id || !categoryId || !label) return undefined;
  const type: DailyReportTaskType = { id, categoryId, label };
  if (typeof row.description === "string" && row.description.trim()) {
    type.description = row.description.trim();
  }
  return type;
}

function parseStoredDailyReportTaxonomy(raw: unknown): DailyReportTaxonomy | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const categories: DailyReportCategory[] = [];
  if (Array.isArray(obj.categories)) {
    for (const item of obj.categories) {
      const parsed = parseCategory(item);
      if (parsed) categories.push(parsed);
    }
  }
  const taskTypes: DailyReportTaskType[] = [];
  if (Array.isArray(obj.taskTypes)) {
    for (const item of obj.taskTypes) {
      const parsed = parseTaskType(item);
      if (parsed) taskTypes.push(parsed);
    }
  }
  if (categories.length === 0 || taskTypes.length === 0) return null;
  return { version: 1, categories, taskTypes };
}

export function parseDailyReportTaxonomy(raw: unknown): DailyReportTaxonomy {
  const stored = parseStoredDailyReportTaxonomy(raw);
  if (!stored) return structuredClone(DEFAULT_DAILY_REPORT_TAXONOMY);
  return mergeTaxonomyWithDefaults(stored);
}

export async function readDailyReportTaxonomy(): Promise<DailyReportTaxonomy> {
  const filePath = getTaxonomyPath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const stored = parseStoredDailyReportTaxonomy(parsed);
    const merged = parseDailyReportTaxonomy(parsed);
    if (
      stored &&
      (stored.categories.length !== merged.categories.length ||
        stored.taskTypes.length !== merged.taskTypes.length)
    ) {
      await writeDailyReportTaxonomy(merged);
    }
    return merged;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return structuredClone(DEFAULT_DAILY_REPORT_TAXONOMY);
    throw error;
  }
}

export async function writeDailyReportTaxonomy(taxonomy: DailyReportTaxonomy): Promise<void> {
  const parsed = parseDailyReportTaxonomy(taxonomy);
  const filePath = getTaxonomyPath();
  await atomicWriteUtf8(filePath, `${JSON.stringify(parsed, null, 2)}\n`);
}
