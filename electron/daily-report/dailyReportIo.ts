import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { parseTaskBlockPlan } from "./dailyReportBlockPlan.ts";
import {
  isValidReportDate,
  reportPathSegments,
  type DailyReportChatTab,
  type DailyReportChatTurn,
  type DailyReportDocument,
  type DailyReportMonthDayIndex,
  type DailyReportTaskEntry,
  type DailyReportTimeLogEntry,
} from "./dailyReportTypes.ts";

const writeChains = new Map<string, Promise<void>>();

function enqueueSerializedWrite(targetPath: string, task: () => Promise<void>): Promise<void> {
  const previous = writeChains.get(targetPath) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(task);
  writeChains.set(targetPath, run);
  return run.finally(() => {
    if (writeChains.get(targetPath) === run) writeChains.delete(targetPath);
  });
}

async function atomicWriteUtf8(targetPath: string, contents: string): Promise<void> {
  await enqueueSerializedWrite(targetPath, async () => {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    const tmp = `${targetPath}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
    await fs.writeFile(tmp, contents, "utf8");
    try {
      await fs.rename(tmp, targetPath);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "EEXIST" || code === "EPERM") {
        await fs.rm(targetPath, { force: true }).catch(() => undefined);
        await fs.rename(tmp, targetPath);
        return;
      }
      await fs.unlink(tmp).catch(() => undefined);
      throw err;
    }
  });
}

export function resolveReportFilePath(storageRoot: string, date: string): string {
  const resolvedRoot = path.resolve(storageRoot);
  const { year, month, filename } = reportPathSegments(date);
  const full = path.join(resolvedRoot, year, month, filename);
  const resolved = path.resolve(full);
  if (!resolved.startsWith(resolvedRoot + path.sep) && resolved !== resolvedRoot) {
    throw new Error("Path escape");
  }
  return resolved;
}

function parseChatTab(raw: unknown): DailyReportChatTab | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  if (!id) return undefined;
  const messages: DailyReportChatTurn[] = [];
  if (Array.isArray(row.messages)) {
    for (const item of row.messages) {
      const parsed = parseChatTurn(item);
      if (parsed) messages.push(parsed);
    }
  }
  const tab: DailyReportChatTab = { id, messages };
  if (typeof row.title === "string" && row.title.trim()) tab.title = row.title.trim();
  return tab;
}

function migrateLegacyChatToTabs(chatMessages: DailyReportChatTurn[]): DailyReportChatTab[] {
  return [{ id: randomUUID(), messages: [...chatMessages] }];
}

function parseChatTabs(raw: unknown, legacyMessages: DailyReportChatTurn[]): DailyReportChatTab[] {
  if (!Array.isArray(raw)) return migrateLegacyChatToTabs(legacyMessages);
  const tabs: DailyReportChatTab[] = [];
  for (const item of raw) {
    const parsed = parseChatTab(item);
    if (parsed) tabs.push(parsed);
  }
  if (tabs.length > 0) return tabs;
  return migrateLegacyChatToTabs(legacyMessages);
}

function parseChatTurn(raw: unknown): DailyReportChatTurn | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id : "";
  const role = row.role;
  const content = typeof row.content === "string" ? row.content : "";
  const timestamp = typeof row.timestamp === "string" ? row.timestamp : "";
  if (!id || (role !== "user" && role !== "assistant" && role !== "system") || !timestamp) {
    return undefined;
  }
  return { id, role, content, timestamp };
}

function parseTimeLogEntry(raw: unknown): DailyReportTimeLogEntry | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const description = typeof row.description === "string" ? row.description.trim() : "";
  const startedAt = typeof row.startedAt === "string" ? row.startedAt : "";
  const endedAt = typeof row.endedAt === "string" ? row.endedAt : "";
  const hours = typeof row.hours === "number" && Number.isFinite(row.hours) ? row.hours : NaN;
  if (!id || !description || !startedAt || !endedAt || !(hours > 0)) return undefined;
  const entry: DailyReportTimeLogEntry = { id, description, startedAt, endedAt, hours };
  const categoryId = typeof row.categoryId === "string" ? row.categoryId.trim() : "";
  const taskTypeId = typeof row.taskTypeId === "string" ? row.taskTypeId.trim() : "";
  if (categoryId) entry.categoryId = categoryId;
  if (taskTypeId) entry.taskTypeId = taskTypeId;
  const summaryEntryId = typeof row.summaryEntryId === "string" ? row.summaryEntryId.trim() : "";
  if (summaryEntryId) entry.summaryEntryId = summaryEntryId;
  return entry;
}

function parseTaskEntry(raw: unknown): DailyReportTaskEntry | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id : "";
  const hours = typeof row.hours === "number" && Number.isFinite(row.hours) ? row.hours : NaN;
  const description = typeof row.description === "string" ? row.description.trim() : "";
  const categoryId =
    typeof row.categoryId === "string"
      ? row.categoryId
      : typeof row.category_id === "string"
        ? row.category_id
        : "";
  const taskTypeId =
    typeof row.taskTypeId === "string"
      ? row.taskTypeId
      : typeof row.task_type_id === "string"
        ? row.task_type_id
        : "";
  if (!id || !(hours > 0) || !description || !categoryId || !taskTypeId) return undefined;
  return { id, hours, description, categoryId, taskTypeId };
}

export function parseDailyReportDocument(raw: unknown, expectedDate?: string): DailyReportDocument | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const date = typeof obj.date === "string" ? obj.date : "";
  if (!isValidReportDate(date)) return null;
  if (expectedDate && date !== expectedDate) return null;

  const entries: DailyReportTaskEntry[] = [];
  if (Array.isArray(obj.entries)) {
    for (const item of obj.entries) {
      const parsed = parseTaskEntry(item);
      if (parsed) entries.push(parsed);
    }
  }

  const legacyChatMessages: DailyReportChatTurn[] = [];
  if (Array.isArray(obj.chatMessages)) {
    for (const item of obj.chatMessages) {
      const parsed = parseChatTurn(item);
      if (parsed) legacyChatMessages.push(parsed);
    }
  }

  const createdAt = typeof obj.createdAt === "string" ? obj.createdAt : new Date().toISOString();
  const updatedAt = typeof obj.updatedAt === "string" ? obj.updatedAt : createdAt;
  const narrative = typeof obj.narrative === "string" && obj.narrative.trim() ? obj.narrative.trim() : undefined;
  const taskBlockPlan = parseTaskBlockPlan(obj.taskBlockPlan);

  let chatTabs = parseChatTabs(obj.chatTabs, legacyChatMessages);
  if (chatTabs.length === 0) {
    chatTabs = [{ id: randomUUID(), messages: [] }];
  }

  const activeChatTabIdRaw = typeof obj.activeChatTabId === "string" ? obj.activeChatTabId.trim() : "";
  const activeChatTabId =
    activeChatTabIdRaw && chatTabs.some((t) => t.id === activeChatTabIdRaw)
      ? activeChatTabIdRaw
      : undefined;

  const timeLogs: DailyReportTimeLogEntry[] = [];
  if (Array.isArray(obj.timeLogs)) {
    for (const item of obj.timeLogs) {
      const parsed = parseTimeLogEntry(item);
      if (parsed) timeLogs.push(parsed);
    }
  }

  return {
    version: 1,
    date,
    entries,
    narrative,
    taskBlockPlan: taskBlockPlan.length > 0 ? taskBlockPlan : undefined,
    chatTabs,
    timeLogs: timeLogs.length > 0 ? timeLogs : undefined,
    activeChatTabId,
    createdAt,
    updatedAt,
  };
}

export function createEmptyDailyReportDocument(date: string): DailyReportDocument {
  const now = new Date().toISOString();
  return {
    version: 1,
    date,
    entries: [],
    chatTabs: [{ id: randomUUID(), messages: [] }],
    createdAt: now,
    updatedAt: now,
  };
}

export async function readDailyReport(storageRoot: string, date: string): Promise<DailyReportDocument | null> {
  if (!isValidReportDate(date)) throw new Error("Invalid report date");
  const filePath = resolveReportFilePath(storageRoot, date);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return parseDailyReportDocument(JSON.parse(raw) as unknown, date);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw error;
  }
}

export async function writeDailyReport(storageRoot: string, document: DailyReportDocument): Promise<void> {
  if (!isValidReportDate(document.date)) throw new Error("Invalid report date");
  const payload = parseDailyReportDocument(document) ?? document;
  const toWrite: DailyReportDocument = {
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  const filePath = resolveReportFilePath(storageRoot, toWrite.date);
  await atomicWriteUtf8(filePath, `${JSON.stringify(toWrite, null, 2)}\n`);
}

export async function listDailyReportMonth(
  storageRoot: string,
  year: number,
  month: number,
): Promise<DailyReportMonthDayIndex[]> {
  if (!Number.isInteger(year) || year < 1970 || year > 9999) throw new Error("Invalid year");
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error("Invalid month");

  const monthDir = path.join(path.resolve(storageRoot), String(year), String(month).padStart(2, "0"));
  const results: DailyReportMonthDayIndex[] = [];

  let names: string[];
  try {
    names = await fs.readdir(monthDir);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw error;
  }

  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const date = name.slice(0, -5);
    if (!isValidReportDate(date) || date.slice(0, 4) !== String(year) || date.slice(5, 7) !== String(month).padStart(2, "0")) {
      continue;
    }
    const doc = await readDailyReport(storageRoot, date);
    results.push({
      date,
      entryCount: doc?.entries.length ?? 0,
    });
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}
