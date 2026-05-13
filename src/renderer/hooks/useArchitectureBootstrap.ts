import { useEffect, useRef } from "react";
import { listConversations } from "@/api/conversations";
import { listTemplates } from "@/api/templates";
import { ConversationPersistenceService } from "@/persistence/services/conversationPersistenceService";
import { useEditorStore } from "@/state/store";
import type { Conversation, TechnicalTemplate } from "@/types";

type UseArchitectureBootstrapArgs = {
  hydrateFromBackend: (payload: { conversations: Conversation[]; templates: TechnicalTemplate[] }) => void;
  clearError: () => void;
};

export function useArchitectureBootstrap({ hydrateFromBackend, clearError }: UseArchitectureBootstrapArgs) {
  const persistEnabledRef = useRef(false);
  const conversationPersistence = useRef(new ConversationPersistenceService());

  useEffect(() => {
    persistEnabledRef.current = false;
    const bootstrap = async () => {
      try {
        const [convs, tmpls] = await Promise.all([listConversations(), listTemplates()]);
        hydrateFromBackend({ conversations: convs, templates: tmpls });
        const first = convs[0];
        if (first?.activeChatTabId) {
          void useEditorStore.getState().loadConversationTab(first.activeChatTabId);
        }
        clearError();
      } catch (error) {
        useEditorStore.setState({
          errorMessage:
            error instanceof Error ? error.message : "Failed to load saved conversations and templates.",
        });
      } finally {
        /** Persist after load: Electron (per-chat folders), browser + backend (HTTP PUT), or localStorage. */
        persistEnabledRef.current = typeof window !== "undefined";
      }
    };

    void bootstrap();
  }, [hydrateFromBackend, clearError]);

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
}
