import { spawn } from "node:child_process";
import {
  INTEGRATION_IDS,
  KROKI_CONTAINER_NAME,
  KROKI_PORT,
  TECTONIC_IMAGE,
  type IntegrationId,
} from "../../shared/integrations.ts";
import { getCatalogEntry } from "./catalog.ts";

export type IntegrationHealthResult = {
  id: IntegrationId;
  ok: boolean;
  error?: string;
};

const KROKI_PROBE_SOURCE = "@startuml\nAlice -> Bob: ping\n@enduml\n";

function runCommand(
  command: string,
  args: string[],
  timeoutMs: number,
): Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (c: string) => {
      stdout += c;
    });
    child.stderr?.on("data", (c: string) => {
      stderr += c;
    });
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }, timeoutMs);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({ code, stdout, stderr, timedOut });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolvePromise({ code: -1, stdout, stderr: `${stderr}\n${err.message}`, timedOut: false });
    });
  });
}

async function checkKroki(): Promise<IntegrationHealthResult> {
  const url = `http://127.0.0.1:${KROKI_PORT}/plantuml/png`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: KROKI_PROBE_SOURCE,
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        id: "kroki",
        ok: false,
        error: `Kroki returned HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`,
      };
    }
    const blob = await res.blob();
    if (blob.size === 0) {
      return { id: "kroki", ok: false, error: "Kroki returned an empty image" };
    }
    return { id: "kroki", ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      id: "kroki",
      ok: false,
      error: `Cannot reach Kroki at localhost:${KROKI_PORT} (${KROKI_CONTAINER_NAME}). ${msg}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkTectonic(): Promise<IntegrationHealthResult> {
  const { code, stderr, stdout, timedOut } = await runCommand(
    "docker",
    ["run", "--rm", TECTONIC_IMAGE, "tectonic", "--version"],
    120_000,
  );
  if (timedOut) {
    return { id: "tectonic", ok: false, error: "Tectonic health check timed out" };
  }
  if (code === 0) {
    return { id: "tectonic", ok: true };
  }
  const detail = (stderr || stdout).trim().slice(0, 400);
  return {
    id: "tectonic",
    ok: false,
    error:
      detail ||
      "Cannot run Tectonic via Docker. Open Configuration → Integrations and click Execute for LaTeX (Tectonic).",
  };
}

export async function checkIntegration(id: IntegrationId): Promise<IntegrationHealthResult> {
  if (id === "plentymarkets") {
    return { id, ok: false, error: "Plentymarkets integration is not configured yet" };
  }
  if (!getCatalogEntry(id)) {
    return { id, ok: false, error: "Unknown integration" };
  }
  if (id === "kroki") return checkKroki();
  if (id === "tectonic") return checkTectonic();
  return { id, ok: false, error: "Unsupported integration" };
}

export async function checkIntegrations(ids?: IntegrationId[]): Promise<IntegrationHealthResult[]> {
  const target = ids ?? [...INTEGRATION_IDS];
  return Promise.all(target.map((id) => checkIntegration(id)));
}
