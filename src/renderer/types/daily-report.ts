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

export type DailyReportTimeLogEntry = {
  id: string;
  description: string;
  startedAt: string;
  endedAt: string;
  hours: number;
  categoryId?: string;
  taskTypeId?: string;
  summaryEntryId?: string;
};

export type DailyReportActiveTimeTracker = {
  date: string;
  /** ISO start of the current run segment (legacy: same as first segment). */
  startedAt: string;
  description: string;
  categoryId?: string;
  taskTypeId?: string;
  /** Milliseconds counted before the current segment (across pauses). */
  accumulatedMs?: number;
  /** When true, the timer is paused and elapsed time is frozen. */
  paused?: boolean;
};

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
  taskBlockPlan?: DailyReportBlockSpec[];
  chatTabs: DailyReportChatTab[];
  timeLogs?: DailyReportTimeLogEntry[];
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

export type DailyReportStorageRootInfo = {
  storageRoot: string;
  customPath: string | null;
  defaultPath: string;
};

export type DailyReportChatRequest = {
  sessionKey: string;
  date: string;
  prompt: string;
  taskBlockPlan?: DailyReportBlockSpec[];
  messages?: DailyReportChatTurn[];
  currentEntries?: DailyReportTaskEntry[];
  aiSelection?: import("./electron-api").LocalAiSelection;
  streamId?: string;
};

export type DailyReportChatResponse = {
  reply: string;
  summary?: DailyReportSummary;
  parseError?: string;
};

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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidReportDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDisplayDate(date: string, locale: "en" | "pt"): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(y, m - 1, d));
}
