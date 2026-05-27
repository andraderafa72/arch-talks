import { useCallback, useEffect, useState } from "react";
import { userPreferencesService } from "@/persistence/services/userPreferencesService";
import type { IntegrationHealthResult } from "@/types/electron-api";
import type { IntegrationId, IntegrationState, IntegrationsPreferences } from "@/types/userPreferences";
import { DEFAULT_INTEGRATIONS, mergeUserPreferences } from "@/types/userPreferences";

export function useIntegrationsPreferences(): {
  integrations: IntegrationsPreferences;
  loading: boolean;
  applyHealthResults: (results: IntegrationHealthResult[]) => Promise<void>;
  patchIntegration: (id: IntegrationId, patch: Partial<IntegrationState>) => Promise<void>;
} {
  const [integrations, setIntegrations] = useState<IntegrationsPreferences>(DEFAULT_INTEGRATIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const prefs = await userPreferencesService.load();
      if (!cancelled) {
        setIntegrations(prefs.integrations);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patchIntegration = useCallback(async (id: IntegrationId, patch: Partial<IntegrationState>) => {
    const current = userPreferencesService.getCached();
    const next = mergeUserPreferences(current, {
      integrations: {
        ...current.integrations,
        [id]: { ...current.integrations[id], ...patch },
      },
    });
    setIntegrations(next.integrations);
    await userPreferencesService.patch({ integrations: next.integrations });
  }, []);

  const applyHealthResults = useCallback(
    async (results: IntegrationHealthResult[]) => {
      const current = userPreferencesService.getCached();
      const now = new Date().toISOString();
      const merged: IntegrationsPreferences = { ...current.integrations };
      for (const result of results) {
        merged[result.id] = {
          configured: result.ok,
          lastCheckedAt: now,
          lastError: result.ok ? undefined : result.error,
        };
      }
      const next = mergeUserPreferences(current, { integrations: merged });
      setIntegrations(next.integrations);
      await userPreferencesService.patch({ integrations: next.integrations });
    },
    [],
  );

  return { integrations, loading, applyHealthResults, patchIntegration };
}
