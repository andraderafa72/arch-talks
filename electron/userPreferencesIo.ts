import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

const PREFERENCES_FILE = "user-preferences.json";

function getPreferencesPath(): string {
  return path.join(app.getPath("userData"), PREFERENCES_FILE);
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

export async function readUserPreferencesFile(): Promise<unknown | null> {
  const filePath = getPreferencesPath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw error;
  }
}

export async function writeUserPreferencesFile(preferences: unknown): Promise<void> {
  const filePath = getPreferencesPath();
  await atomicWriteUtf8(filePath, `${JSON.stringify(preferences, null, 2)}\n`);
}
