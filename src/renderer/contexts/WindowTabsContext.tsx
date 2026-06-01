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
  /** When true, always opens a new tab even if one already exists for the conversation. */
  forceNew?: boolean;
};

type WindowTabsContextValue = {
  tabs: WindowTab[];
  activeTabId: string;
  activeTab: WindowTab | undefined;
  activeTabConversationId: string | undefined;
  isHomeActive: boolean;
  selectTab: (tab: WindowTab) => void;
  closeTab: (tabId: string) => void;
  openNewTab: (options: OpenNewTabOptions) => void;
  /** Opens a workspace tab, or focuses it if that conversation is already open. */
  openWorkspace: (conversationId: string, label?: string) => void;
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
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

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

  useEffect(() => {
    if (skipLocationSyncRef.current) {
      skipLocationSyncRef.current = false;
      return;
    }

    const path = `${location.pathname}${location.search}`;
    const pathname = location.pathname;
    const { activeConversationId: latestConversationId, conversations: latestConversations, locale: latestLocale } =
      useEditorStore.getState();

    const currentTabs = tabsRef.current;
    let nextActiveId = activeTabIdRef.current;
    let appendedTab: WindowTab | null = null;

    if (pathname === "/") {
      const homeTab = currentTabs.find(isHomeTab);
      if (homeTab) nextActiveId = homeTab.id;
    } else if (pathname === "/workspace" && latestConversationId) {
      const match = currentTabs.find((tab) => tab.conversationId === latestConversationId);
      if (match) {
        nextActiveId = match.id;
      } else {
        const { pathname: tabPathname, search } = parseRoutePath(path);
        const conversation = latestConversations[latestConversationId];
        appendedTab = createWindowTab(tabPathname, search, latestLocale, {
          id: newWindowTabId(),
          conversationId: latestConversationId,
          label: conversation
            ? workspaceTabTitle(conversation, latestLocale)
            : labelForRoute("/workspace", "", latestLocale),
        });
        nextActiveId = appendedTab.id;
      }
    } else {
      const active = currentTabs.find((tab) => tab.id === activeTabIdRef.current);
      const needsDedicatedTab = !active || isHomeTab(active);

      if (needsDedicatedTab) {
        const existing = currentTabs.find((tab) => !isHomeTab(tab) && tab.path === path);
        if (existing) {
          nextActiveId = existing.id;
        } else {
          const { pathname: tabPathname, search } = parseRoutePath(path);
          appendedTab = createWindowTab(tabPathname, search, latestLocale, { id: newWindowTabId() });
          nextActiveId = appendedTab.id;
        }
      }
    }

    if (nextActiveId !== activeTabIdRef.current) {
      setActiveTabId(nextActiveId);
    }

    setTabs((current) => {
      const base = appendedTab ? [...current, appendedTab] : current;
      const activeIndex = base.findIndex((tab) => tab.id === nextActiveId);
      if (activeIndex === -1) return base;

      const active = base[activeIndex];
      if (isHomeTab(active)) return base;

      const isWorkspace = pathname === "/workspace";
      const conversationId = isWorkspace
        ? (active.conversationId ?? latestConversationId ?? undefined)
        : undefined;
      const label = tabLabel({ path, conversationId, label: active.label }, latestLocale, latestConversations);

      if (active.path === path && active.conversationId === conversationId && active.label === label) {
        return base;
      }

      return base.map((tab, tabIndex) =>
        tabIndex === activeIndex ? { ...tab, path, conversationId, label } : tab,
      );
    });
  }, [location.pathname, location.search]);

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
    ({ path, conversationId, label, forceNew }: OpenNewTabOptions) => {
      const currentTabs = tabsRef.current;

      if (conversationId && !forceNew) {
        const existing = currentTabs.find((tab) => tab.conversationId === conversationId);
        if (existing) {
          selectTab(existing);
          return;
        }
      }

      const { pathname, search } = parseRoutePath(path);
      if (pathname === "/") {
        const existingHome = currentTabs.find((tab) => isHomeTab(tab));
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
    [conversations, locale, navigate, selectTab, setActiveConversation],
  );

  const openWorkspace = useCallback(
    (conversationId: string, label?: string) => {
      const conversation = conversations[conversationId];
      openNewTab({
        path: "/workspace",
        conversationId,
        label: label ?? conversation?.title,
      });
    },
    [conversations, openNewTab],
  );

  const goHome = useCallback(() => {
    const existingHome = tabsRef.current.find((tab) => isHomeTab(tab));
    if (existingHome) {
      selectTab(existingHome);
      return;
    }

    skipLocationSyncRef.current = true;
    const homeTab = defaultHomeTab(locale);
    setTabs((current) => [...current, homeTab]);
    setActiveTabId(homeTab.id);
    navigate("/");
  }, [locale, navigate, selectTab]);

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((current) => {
        if (current.length <= 1) return current;
        const index = current.findIndex((tab) => tab.id === tabId);
        if (index === -1) return current;

        const nextTabs = current.filter((tab) => tab.id !== tabId);
        if (tabId === activeTabIdRef.current) {
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
    [locale, navigate, setActiveConversation],
  );

  const isHomeActive = location.pathname === "/";
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const activeTabConversationId = activeTab?.conversationId;

  const value = useMemo(
    () => ({
      tabs,
      activeTabId,
      activeTab,
      activeTabConversationId,
      isHomeActive,
      selectTab,
      closeTab,
      openNewTab,
      openWorkspace,
      goHome,
    }),
    [activeTab, activeTabConversationId, activeTabId, closeTab, goHome, isHomeActive, openNewTab, openWorkspace, selectTab, tabs],
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
