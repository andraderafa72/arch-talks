import { ipcRenderer } from "electron";
import type {
  IntegrationCheckResponse,
  IntegrationId,
  IntegrationRunStartResponse,
} from "../../src/renderer/types/electron-api.ts";

export function exposeIntegrationsApi(): Pick<
  import("../../src/renderer/types/electron-api.ts").ElectronApi,
  "integrationsCheck" | "integrationsRunStart"
> {
  return {
    integrationsCheck: (payload?: IntegrationId | "all"): Promise<IntegrationCheckResponse> =>
      ipcRenderer.invoke("integrations:check", payload ?? "all"),
    integrationsRunStart: (id: IntegrationId): Promise<IntegrationRunStartResponse> =>
      ipcRenderer.invoke("integrations:runStart", id),
  };
}
