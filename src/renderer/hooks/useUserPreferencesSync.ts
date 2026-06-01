import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useWorkspaceLayoutContext } from "@/contexts/WorkspaceLayoutContext";
import { userPreferencesService } from "@/persistence/services/userPreferencesService";
import { useEditorStore } from "@/state/store";
import { normalizeAppRoute } from "@/types/userPreferences";

export function useUserPreferencesSync(): void {
  const location = useLocation();
  const { leftWidth, rightWidth, bottomHeight, filesSidebarWidth } = useWorkspaceLayoutContext();

  useEffect(() => {
    if (!userPreferencesService.isHydrated()) return;
    userPreferencesService.patch({ lastRoute: normalizeAppRoute(location.pathname) });
  }, [location.pathname]);

  useEffect(() => {
    return useEditorStore.subscribe((state, prev) => {
      if (!userPreferencesService.isHydrated()) return;
      const patch: Partial<ReturnType<typeof userPreferencesService.getCached>> = {};
      if (state.theme !== prev.theme) patch.theme = state.theme;
      if (state.locale !== prev.locale) patch.locale = state.locale;
      if (state.uiThemeId !== prev.uiThemeId) patch.uiThemeId = state.uiThemeId;
      // Keep persisted palette id aligned with the live store when other fields change (e.g. tab switches).
      if (
        patch.uiThemeId === undefined &&
        state.uiThemeId !== userPreferencesService.getCached().uiThemeId
      ) {
        patch.uiThemeId = state.uiThemeId;
      }
      if (state.activeConversationId !== prev.activeConversationId) {
        patch.activeConversationId = state.activeConversationId;
      }
      if (state.speechModelId !== prev.speechModelId) {
        patch.speechModelId = state.speechModelId;
      }
      if (Object.keys(patch).length > 0) {
        userPreferencesService.patch(patch);
      }
    });
  }, []);

  useEffect(() => {
    if (!userPreferencesService.isHydrated()) return;
    userPreferencesService.patch({
      workspaceLayout: { leftWidth, rightWidth, bottomHeight, filesSidebarWidth },
    });
  }, [filesSidebarWidth, leftWidth, rightWidth, bottomHeight]);
}
