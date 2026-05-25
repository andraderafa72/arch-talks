import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listConversations } from "@/api/conversations";
import { listTemplates } from "@/api/templates";
import { ConversationPersistenceService } from "@/persistence/services/conversationPersistenceService";
import { userPreferencesService } from "@/persistence/services/userPreferencesService";
import { useEditorStore } from "@/state/store";
import type { Conversation, TechnicalTemplate } from "@/types";
import type { UserPreferencesV1, WorkspaceLayoutPreferences } from "@/types/userPreferences";
import { DEFAULT_WORKSPACE_LAYOUT } from "@/types/userPreferences";

type UseArchitectureBootstrapArgs = {
  hydrateFromBackend: (payload: { conversations: Conversation[]; templates: TechnicalTemplate[] }) => void;
  clearError: () => void;
};

type BootstrapState = {
  ready: boolean;
  initialLayout: WorkspaceLayoutPreferences;
};

export function useArchitectureBootstrap({ hydrateFromBackend, clearError }: UseArchitectureBootstrapArgs): BootstrapState {
  const navigate = useNavigate();
  const persistEnabledRef = useRef(false);
  const conversationPersistence = useRef(new ConversationPersistenceService());
  const restoredRouteRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [initialLayout, setInitialLayout] = useState<WorkspaceLayoutPreferences>(DEFAULT_WORKSPACE_LAYOUT);

  useEffect(() => {
    persistEnabledRef.current = false;
    restoredRouteRef.current = false;

    const bootstrap = async () => {
      let preferences: UserPreferencesV1 = await userPreferencesService.load();
      useEditorStore.getState().applyUserPreferences(preferences);
      useEditorStore.setState({ activeConversationId: preferences.activeConversationId });
      setInitialLayout(preferences.workspaceLayout);

      try {
        const [convs, tmpls] = await Promise.all([listConversations(), listTemplates()]);
        hydrateFromBackend({ conversations: convs, templates: tmpls });

        const preferredConversationId = preferences.activeConversationId;
        if (preferredConversationId && convs.some((conversation) => conversation.id === preferredConversationId)) {
          useEditorStore.getState().setActiveConversation(preferredConversationId);
        } else {
          const first = convs[0];
          if (first?.activeChatTabId) {
            void useEditorStore.getState().loadConversationTab(first.activeChatTabId);
          }
        }

        if (!restoredRouteRef.current) {
          restoredRouteRef.current = true;
          navigate(preferences.lastRoute, { replace: true });
        }

        clearError();
      } catch (error) {
        useEditorStore.setState({
          errorMessage:
            error instanceof Error ? error.message : "Failed to load saved conversations and templates.",
        });
      } finally {
        userPreferencesService.enablePersist();
        persistEnabledRef.current = typeof window !== "undefined";
        setReady(true);
      }
    };

    void bootstrap();
  }, [clearError, hydrateFromBackend, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const unsub = useEditorStore.subscribe((state, prev) => {
      if (!persistEnabledRef.current) return;
      if (state.conversations === prev.conversations && state.technicalTemplates === prev.technicalTemplates) {
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        void conversationPersistence.current
          .persistArchitectureState(state.conversations, state.technicalTemplates)
          .catch((err) => {
            console.error(err);
          });
      }, 400);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, []);

  return { ready, initialLayout };
}
