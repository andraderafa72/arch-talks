import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createWindowTab,
  defaultHomeTab,
  isHomeTab,
  labelForRoute,
  newWindowTabId,
  parseRoutePath,
  type WindowTab,
} from "@/lib/windowTabs";
import { workspaceTabTitle } from "@/lib/conversationMeta";
import { useEditorStore } from "@/state/store";

export type OpenNewTabOptions = {
  path: string;
  conversationId?: string;
  label?: string;
};

type WindowTabsContextValue = {
  tabs: WindowTab[];
  activeTabId: string;
  isHomeActive: boolean;
  selectTab: (tab: WindowTab) => void;
  closeTab: (tabId: string) => void;
  openNewTab: (options: OpenNewTabOptions) => void;
  goHome: () => void;
};

const WindowTabsContext = createContext<WindowTabsContextValue | null>(null);

function tabLabel(
  tab: Pick<WindowTab, "path" | "conversationId" | "label">,
  locale: ReturnType<typeof useEditorStore.getState>["locale"],
  conversations: ReturnType<typeof useEditorStore.getState>["conversations"],
): string {
  const { pathname, search } = parseRoutePath(tab.path);
  const genericWorkspaceLabel = labelForRoute("/workspace", "", locale);

  if (pathname === "/workspace") {
    if (tab.conversationId) {
      const conversation = conversations[tab.conversationId];
      if (conversation) {
        return workspaceTabTitle(conversation, locale);
      }
    }
    if (tab.label && tab.label !== genericWorkspaceLabel) {
      return tab.label;
    }
    return genericWorkspaceLabel;
  }

  return labelForRoute(pathname, search, locale);
}

function activateConversation(
  conversationId: string,
  setActiveConversation: (id: string) => void,
) {
  setActiveConversation(conversationId);
}

export function WindowTabsProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const locale = useEditorStore((state) => state.locale);
  const conversations = useEditorStore((state) => state.conversations);
  const setActiveConversation = useEditorStore((state) => state.setActiveConversation);
  const skipLocationSyncRef = useRef(false);

  const [tabs, setTabs] = useState<WindowTab[]>(() => [defaultHomeTab(locale)]);
  const [activeTabId, setActiveTabId] = useState(() => defaultHomeTab(locale).id);
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  const updateTabLabels = useCallback(() => {
    const { conversations: latestConversations, locale: latestLocale } = useEditorStore.getState();
    setTabs((current) => {
      let changed = false;
      const next = current.map((tab) => {
        const label = tabLabel(tab, latestLocale, latestConversations);
        if (tab.label === label) return tab;
        changed = true;
        return { ...tab, label };
      });
      return changed ? next : current;
    });
  }, []);

  const syncActiveTabToLocation = useCallback(() => {
    const path = `${location.pathname}${location.search}`;
    const isWorkspace = location.pathname === "/workspace";
    const { activeConversationId: latestConversationId, conversations: latestConversations, locale: latestLocale } =
      useEditorStore.getState();

    setTabs((current) => {
      const index = current.findIndex((tab) => tab.id === activeTabIdRef.current);
      if (index === -1) return current;

      const active = current[index];
      const conversationId = isWorkspace
        ? (active.conversationId ?? latestConversationId ?? undefined)
        : undefined;
      const label = tabLabel({ path, conversationId, label: active.label }, latestLocale, latestConversations);

      if (active.path === path && active.conversationId === conversationId && active.label === label) {
        return current;
      }

      return current.map((tab, tabIndex) =>
        tabIndex === index ? { ...tab, path, conversationId, label } : tab,
      );
    });
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (skipLocationSyncRef.current) {
      skipLocationSyncRef.current = false;
      return;
    }

    const path = location.pathname;
    const { activeConversationId: latestConversationId } = useEditorStore.getState();

    setTabs((currentTabs) => {
      if (path === "/") {
        const homeTab = currentTabs.find(isHomeTab);
        if (homeTab && homeTab.id !== activeTabIdRef.current) {
          setActiveTabId(homeTab.id);
        }
      } else if (path === "/workspace" && latestConversationId) {
        const match = currentTabs.find((tab) => tab.conversationId === latestConversationId);
        if (match && match.id !== activeTabIdRef.current) {
          setActiveTabId(match.id);
        }
      }
      return currentTabs;
    });

    syncActiveTabToLocation();
  }, [syncActiveTabToLocation]);

  useEffect(() => {
    return useEditorStore.subscribe((state, prevState) => {
      if (state.conversations === prevState.conversations && state.locale === prevState.locale) return;
      updateTabLabels();
    });
  }, [updateTabLabels]);

  const selectTab = useCallback(
    (tab: WindowTab) => {
      skipLocationSyncRef.current = true;
      setActiveTabId(tab.id);
      if (tab.conversationId) {
        activateConversation(tab.conversationId, setActiveConversation);
      }
      navigate(tab.path);
    },
    [navigate, setActiveConversation],
  );

  const openNewTab = useCallback(
    ({ path, conversationId, label }: OpenNewTabOptions) => {
      if (conversationId) {
        const existing = tabs.find((tab) => tab.conversationId === conversationId);
        if (existing) {
          selectTab(existing);
          return;
        }
      }

      const { pathname, search } = parseRoutePath(path);
      if (pathname === "/") {
        const existingHome = tabs.find((tab) => isHomeTab(tab));
        if (existingHome) {
          selectTab(existingHome);
          return;
        }
      }

      skipLocationSyncRef.current = true;
      const conversation = conversationId ? conversations[conversationId] : undefined;
      const resolvedLabel =
        conversation && pathname === "/workspace" ? workspaceTabTitle(conversation, locale) : label;
      const tab = createWindowTab(pathname, search, locale, {
        id: newWindowTabId(),
        conversationId,
        label: resolvedLabel,
      });

      setTabs((current) => [...current, tab]);
      setActiveTabId(tab.id);
      navigate(path);

      if (conversationId) {
        activateConversation(conversationId, setActiveConversation);
      }
    },
    [conversations, locale, navigate, selectTab, setActiveConversation, tabs],
  );

  const goHome = useCallback(() => {
    const existingHome = tabs.find((tab) => isHomeTab(tab));
    if (existingHome) {
      selectTab(existingHome);
      return;
    }

    skipLocationSyncRef.current = true;
    const homeTab = defaultHomeTab(locale);
    setTabs((current) => [...current, homeTab]);
    setActiveTabId(homeTab.id);
    navigate("/");
  }, [locale, navigate, selectTab, tabs]);

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((current) => {
        if (current.length <= 1) return current;
        const index = current.findIndex((tab) => tab.id === tabId);
        if (index === -1) return current;

        const nextTabs = current.filter((tab) => tab.id !== tabId);
        if (tabId === activeTabId) {
          const fallback = nextTabs[Math.min(index, nextTabs.length - 1)] ?? defaultHomeTab(locale);
          skipLocationSyncRef.current = true;
          setActiveTabId(fallback.id);
          navigate(fallback.path);
          if (fallback.conversationId) {
            activateConversation(fallback.conversationId, setActiveConversation);
          }
        }
        return nextTabs;
      });
    },
    [activeTabId, locale, navigate, setActiveConversation],
  );

  const isHomeActive = location.pathname === "/";

  const value = useMemo(
    () => ({
      tabs,
      activeTabId,
      isHomeActive,
      selectTab,
      closeTab,
      openNewTab,
      goHome,
    }),
    [activeTabId, closeTab, goHome, isHomeActive, openNewTab, selectTab, tabs],
  );

  return <WindowTabsContext.Provider value={value}>{children}</WindowTabsContext.Provider>;
}

export function useWindowTabsContext() {
  const context = useContext(WindowTabsContext);
  if (!context) {
    throw new Error("useWindowTabsContext must be used within WindowTabsProvider");
  }
  return context;
}
