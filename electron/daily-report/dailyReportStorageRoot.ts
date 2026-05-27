import { app } from "electron";
import path from "node:path";
import { readUserPreferencesFile, writeUserPreferencesFile } from "../userPreferencesIo.ts";

export const DEFAULT_DAILY_REPORTS_FOLDER = "DailyReports";

export function getDefaultDailyReportsRoot(): string {
  return path.join(app.getPath("userData"), DEFAULT_DAILY_REPORTS_FOLDER);
}

type DailyReportsPrefs = {
  storageRootPath?: string | null;
};

function parseStorageRootFromPrefs(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const dailyReports = (raw as Record<string, unknown>).dailyReports;
  if (!dailyReports || typeof dailyReports !== "object" || Array.isArray(dailyReports)) return null;
  const path = (dailyReports as DailyReportsPrefs).storageRootPath;
  if (typeof path === "string" && path.trim()) return path.trim();
  return null;
}

export async function getEffectiveDailyReportsRoot(): Promise<{
  storageRoot: string;
  customPath: string | null;
  defaultPath: string;
}> {
  const defaultPath = getDefaultDailyReportsRoot();
  const prefs = await readUserPreferencesFile();
  const customPath = parseStorageRootFromPrefs(prefs);
  return {
    storageRoot: customPath ?? defaultPath,
    customPath,
    defaultPath,
  };
}

export async function setDailyReportsStorageRoot(storageRootPath: string | null): Promise<void> {
  const prefs = (await readUserPreferencesFile()) ?? {};
  const base =
    prefs && typeof prefs === "object" && !Array.isArray(prefs)
      ? { ...(prefs as Record<string, unknown>) }
      : {};
  const dailyReports =
    base.dailyReports && typeof base.dailyReports === "object" && !Array.isArray(base.dailyReports)
      ? { ...(base.dailyReports as Record<string, unknown>) }
      : {};
  if (storageRootPath === null || storageRootPath === undefined) {
    delete dailyReports.storageRootPath;
  } else {
    dailyReports.storageRootPath = storageRootPath;
  }
  base.dailyReports = dailyReports;
  await writeUserPreferencesFile(base);
}
