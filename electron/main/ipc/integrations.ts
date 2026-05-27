import { ipcMain } from "electron";
import { INTEGRATION_IDS, isIntegrationId, type IntegrationId } from "../../../shared/integrations.ts";
import { checkIntegrations } from "../../integrations/healthChecks.ts";
import { runIntegrationStart } from "../../integrations/runIntegrationStart.ts";

function parseIds(payload: unknown): IntegrationId[] | "all" | null {
  if (payload === undefined || payload === null || payload === "all") {
    return "all";
  }
  if (typeof payload === "string" && isIntegrationId(payload)) {
    return [payload];
  }
  if (typeof payload === "object" && !Array.isArray(payload)) {
    const id = (payload as { id?: unknown }).id;
    if (typeof id === "string" && isIntegrationId(id)) {
      return [id];
    }
  }
  return null;
}

export function registerIntegrationsIpc(): void {
  ipcMain.handle("integrations:check", async (_evt, payload: unknown) => {
    const ids = parseIds(payload);
    if (ids === null) {
      return { ok: false as const, error: "Invalid integration id" };
    }
    const target = ids === "all" ? (INTEGRATION_IDS as IntegrationId[]) : ids;
    const results = await checkIntegrations(target);
    return { ok: true as const, results };
  });

  ipcMain.handle("integrations:runStart", async (_evt, payload: unknown) => {
    const id =
      typeof payload === "string"
        ? payload
        : typeof payload === "object" && payload && typeof (payload as { id?: unknown }).id === "string"
          ? (payload as { id: string }).id
          : null;
    if (!id || !isIntegrationId(id)) {
      return { ok: false as const, error: "Invalid integration id" };
    }
    const result = await runIntegrationStart(id);
    return result;
  });
}
