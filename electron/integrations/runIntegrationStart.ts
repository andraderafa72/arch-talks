import { spawn } from "node:child_process";
import type { IntegrationId } from "../../shared/integrations.ts";
import { getCatalogEntry } from "./catalog.ts";

export type RunIntegrationStartResult = {
  ok: boolean;
  error?: string;
  pid?: number;
};

export function runIntegrationStart(id: IntegrationId): Promise<RunIntegrationStartResult> {
  const entry = getCatalogEntry(id);
  if (!entry) {
    return Promise.resolve({ ok: false, error: "Unknown integration" });
  }
  if (!entry.canExecute) {
    return Promise.resolve({ ok: false, error: "This integration cannot be started yet" });
  }

  const [command, ...args] = entry.startCommandArgv;
  if (!command) {
    return Promise.resolve({ ok: false, error: "Invalid start command" });
  }

  return new Promise((resolvePromise) => {
    try {
      const child = spawn(command, args, {
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stderr = "";
      child.stderr?.setEncoding("utf8");
      child.stderr?.on("data", (c: string) => {
        stderr += c;
      });
      child.on("error", (err) => {
        resolvePromise({ ok: false, error: err.message });
      });
      child.on("spawn", () => {
        child.unref();
      });
      child.on("close", (code) => {
        if (code === 0) {
          resolvePromise({ ok: true, pid: child.pid });
          return;
        }
        const msg = stderr.trim() || `docker exited with code ${code ?? "unknown"}`;
        resolvePromise({ ok: false, error: msg });
      });
    } catch (e) {
      resolvePromise({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  });
}
