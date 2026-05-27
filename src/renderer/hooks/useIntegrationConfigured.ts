import { useEffect, useState } from "react";
import { userPreferencesService } from "@/persistence/services/userPreferencesService";
import type { IntegrationId } from "@/types/userPreferences";

/** Returns whether an integration is marked configured in preferences, or null while loading. */
export function useIntegrationConfigured(id: IntegrationId): boolean | null {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void userPreferencesService.load().then((prefs) => {
      if (!cancelled) {
        setConfigured(prefs.integrations[id]?.configured === true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return configured;
}
