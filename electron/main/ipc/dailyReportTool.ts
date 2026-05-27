import { dialog, ipcMain } from "electron";
import { buildDailyReportSystemPrompt } from "../chatPrompts.ts";
import { runLocalAiChat } from "../localAiRuntime.ts";
import {
  createEmptyDailyReportDocument,
  listDailyReportMonth,
  readDailyReport,
  writeDailyReport,
} from "../../daily-report/dailyReportIo.ts";
import { partitionDailyReportReply } from "../../daily-report/parseDailyReportSummary.ts";
import { buildDailyReportUserPrompt } from "../../daily-report/dailyReportChatPrompt.ts";
import {
  getEffectiveDailyReportsRoot,
  setDailyReportsStorageRoot,
} from "../../daily-report/dailyReportStorageRoot.ts";
import { readDailyReportTaxonomy, writeDailyReportTaxonomy } from "../../daily-report/taxonomyIo.ts";
import { parseTaskBlockPlan } from "../../daily-report/dailyReportBlockPlan.ts";
import {
  isValidReportDate,
  type DailyReportDocument,
  type DailyReportChatTurn,
  type DailyReportTaskEntry,
  type DailyReportTaxonomy,
} from "../../daily-report/dailyReportTypes.ts";
import type { LocalAiSelection } from "../../../src/renderer/types/electron-api.ts";

function parseDatePayload(payload: unknown): string {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invalid payload");
  }
  const date = (payload as { date?: unknown }).date;
  if (typeof date !== "string" || !isValidReportDate(date)) {
    throw new Error("Invalid date");
  }
  return date;
}

function parseTaxonomyPayload(payload: unknown): DailyReportTaxonomy {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invalid taxonomy");
  }
  return payload as DailyReportTaxonomy;
}

export function registerDailyReportIpc(): void {
  ipcMain.handle("dailyReport:loadTaxonomy", async () => readDailyReportTaxonomy());

  ipcMain.handle("dailyReport:saveTaxonomy", async (_evt, payload: unknown) => {
    const taxonomy = parseTaxonomyPayload(payload);
    await writeDailyReportTaxonomy(taxonomy);
    return { ok: true as const };
  });

  ipcMain.handle("dailyReport:getStorageRoot", async () => getEffectiveDailyReportsRoot());

  ipcMain.handle("dailyReport:setStorageRoot", async (_evt, payload: unknown) => {
    if (payload === null || payload === undefined) {
      await setDailyReportsStorageRoot(null);
      return getEffectiveDailyReportsRoot();
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid storage root payload");
    }
    const path = (payload as { storageRootPath?: unknown }).storageRootPath;
    if (typeof path !== "string" || !path.trim()) {
      throw new Error("Invalid storageRootPath");
    }
    await setDailyReportsStorageRoot(path.trim());
    return getEffectiveDailyReportsRoot();
  });

  ipcMain.handle("dailyReport:pickStorageRoot", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false as const, canceled: true };
    }
    const picked = result.filePaths[0]!;
    await setDailyReportsStorageRoot(picked);
    return { ok: true as const, ...(await getEffectiveDailyReportsRoot()) };
  });

  ipcMain.handle("dailyReport:listMonth", async (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid listMonth payload");
    }
    const { year, month } = payload as { year?: unknown; month?: unknown };
    if (typeof year !== "number" || typeof month !== "number") {
      throw new Error("Invalid year or month");
    }
    const { storageRoot } = await getEffectiveDailyReportsRoot();
    return listDailyReportMonth(storageRoot, year, month);
  });

  ipcMain.handle("dailyReport:load", async (_evt, payload: unknown) => {
    const date = parseDatePayload(payload);
    const { storageRoot } = await getEffectiveDailyReportsRoot();
    const doc = await readDailyReport(storageRoot, date);
    return doc ?? createEmptyDailyReportDocument(date);
  });

  ipcMain.handle("dailyReport:save", async (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid save payload");
    }
    const document = (payload as { document?: unknown }).document;
    if (!document || typeof document !== "object") {
      throw new Error("Invalid document");
    }
    const { storageRoot } = await getEffectiveDailyReportsRoot();
    await writeDailyReport(storageRoot, document as DailyReportDocument);
    return { ok: true as const };
  });

  ipcMain.handle("dailyReportChat:send", async (event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid dailyReportChat:send payload");
    }
    const { sessionKey, date, prompt, aiSelection, streamId, taskBlockPlan, messages, currentEntries } = payload as {
      sessionKey: string;
      date: string;
      prompt: string;
      aiSelection?: LocalAiSelection;
      streamId?: string;
      taskBlockPlan?: unknown;
      messages?: unknown;
      currentEntries?: unknown;
    };
    if (
      typeof sessionKey !== "string" ||
      !sessionKey.trim() ||
      typeof prompt !== "string" ||
      !prompt.trim() ||
      !isValidReportDate(date)
    ) {
      throw new Error("Invalid dailyReportChat:send fields");
    }

    const taxonomy = await readDailyReportTaxonomy();
    const plan = parseTaskBlockPlan(taskBlockPlan);
    const systemPrompt = buildDailyReportSystemPrompt({
      date,
      taxonomy,
      taskBlockPlan: plan.length > 0 ? plan : undefined,
    });

    const priorTurns: DailyReportChatTurn[] = Array.isArray(messages)
      ? (messages as DailyReportChatTurn[])
      : [];
    const entries: DailyReportTaskEntry[] = Array.isArray(currentEntries)
      ? (currentEntries as DailyReportTaskEntry[])
      : [];
    const effectivePrompt = buildDailyReportUserPrompt({
      date,
      priorTurns,
      latestUserMessage: prompt,
      currentEntries: entries,
      taskBlockPlan: plan.length > 0 ? plan : undefined,
    });
    const stream =
      typeof streamId === "string" && streamId.trim()
        ? { sender: event.sender, streamId: streamId.trim() }
        : undefined;

    const reply = await runLocalAiChat({
      sessionKey,
      systemPrompt,
      prompt: effectivePrompt,
      selection: aiSelection,
      stream,
    });

    const { reply: cleanReply, summary, parseError } = partitionDailyReportReply(
      reply,
      taxonomy,
      plan.length > 0 ? plan : undefined,
    );
    return { reply: cleanReply, summary, parseError };
  });
}
