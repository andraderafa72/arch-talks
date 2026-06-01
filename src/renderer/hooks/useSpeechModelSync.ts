import { useEffect } from "react";
import { userPreferencesService } from "@/persistence/services/userPreferencesService";
import { useEditorStore } from "@/state/store";

export function useSpeechModelSync(): void {
  const speechModelId = useEditorStore((s) => s.speechModelId);

  useEffect(() => {
    if (!userPreferencesService.isHydrated()) return;
    const api = window.electronApi;
    if (!api?.speechSetModelId) return;
    void api.speechSetModelId(speechModelId);
  }, [speechModelId]);
}
