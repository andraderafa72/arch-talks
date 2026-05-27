export type DailyReportCategory = {
  id: string;
  label: string;
  description?: string;
};

export type DailyReportTaskType = {
  id: string;
  categoryId: string;
  label: string;
  description?: string;
};

export type DailyReportTaxonomy = {
  version: 1;
  categories: DailyReportCategory[];
  taskTypes: DailyReportTaskType[];
};

export type DailyReportChatTurn = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
};

export type DailyReportTaskEntry = {
  id: string;
  hours: number;
  description: string;
  categoryId: string;
  taskTypeId: string;
};

/** One row in the per-day block plan: `count` entries each lasting `hours`. */
export type DailyReportBlockSpec = {
  hours: number;
  count: number;
};

export type DailyReportChatTab = {
  id: string;
  title?: string;
  messages: DailyReportChatTurn[];
};

export type DailyReportDocument = {
  version: 1;
  date: string;
  entries: DailyReportTaskEntry[];
  narrative?: string;
  /** Optional structure for AI generation: e.g. 1×2h + 7×1h. */
  taskBlockPlan?: DailyReportBlockSpec[];
  /** Multiple chat threads per day. */
  chatTabs: DailyReportChatTab[];
  /** Last selected chat tab; restored on load. */
  activeChatTabId?: string;
  /** @deprecated Migrated to chatTabs on load; not written on save. */
  chatMessages?: DailyReportChatTurn[];
  createdAt: string;
  updatedAt: string;
};

export type DailyReportSummaryEntry = {
  hours: number;
  description: string;
  categoryId: string;
  taskTypeId: string;
};

export type DailyReportSummary = {
  narrative?: string;
  entries: DailyReportSummaryEntry[];
};

export type DailyReportMonthDayIndex = {
  date: string;
  entryCount: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidReportDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function reportPathSegments(date: string): { year: string; month: string; filename: string } {
  if (!isValidReportDate(date)) throw new Error("Invalid report date");
  return {
    year: date.slice(0, 4),
    month: date.slice(5, 7),
    filename: `${date}.json`,
  };
}

export function slugFromLabel(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "item";
}

export function uniqueSlug(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
