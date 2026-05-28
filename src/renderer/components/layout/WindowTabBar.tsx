import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useWindowTabsContext } from "@/contexts/WindowTabsContext";
import { displayTabLabel, isHomeTab } from "@/lib/windowTabs";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/state/store";
import { MacWindowControls } from "@/components/layout/MacWindowControls";
import { WinWindowControls } from "@/components/layout/WinWindowControls";
import { Home, Plus, X } from "lucide-react";

function isElectronShell(): boolean {
  return typeof window !== "undefined" && Boolean(window.electronApi?.isFramelessShell ?? window.electronApi?.platform);
}

function useFramelessChrome() {
  const [isMaximized, setIsMaximized] = useState(false);
  const api = typeof window !== "undefined" ? window.electronApi : undefined;

  useEffect(() => {
    if (!api?.windowIsMaximized || !api.subscribeWindowMaximized) return;
    void api.windowIsMaximized().then(setIsMaximized);
    return api.subscribeWindowMaximized(setIsMaximized);
  }, [api]);

  return {
    enabled: isElectronShell(),
    isMaximized,
    platform: api?.platform ?? "web",
    minimize: () => void api?.windowMinimize?.(),
    toggleMaximize: () => void api?.windowToggleMaximize?.().then(setIsMaximized),
    close: () => void api?.windowClose?.(),
  };
}

export function WindowTabBar() {
  const theme = useEditorStore((state) => state.theme);
  const locale = useEditorStore((state) => state.locale);
  const conversations = useEditorStore((state) => state.conversations);
  const activeConversationId = useEditorStore((state) => state.activeConversationId);
  const location = useLocation();
  const { tabs, activeTabId, isHomeActive, selectTab, closeTab, openNewTab, goHome } = useWindowTabsContext();
  const chrome = useFramelessChrome();
  const visibleTabs = useMemo(() => tabs.filter((tab) => !isHomeTab(tab)), [tabs]);
  const homeLabel = locale === "pt" ? "Início" : "Home";

  if (!chrome.enabled) return null;

  const controlsOnLeft = chrome.platform === "darwin";

  const windowControls = controlsOnLeft ? (
    <MacWindowControls
      isMaximized={chrome.isMaximized}
      onMinimize={chrome.minimize}
      onToggleMaximize={chrome.toggleMaximize}
      onClose={chrome.close}
    />
  ) : (
    <WinWindowControls
      isMaximized={chrome.isMaximized}
      onMinimize={chrome.minimize}
      onToggleMaximize={chrome.toggleMaximize}
      onClose={chrome.close}
    />
  );

  return (
    <header
      className={cn(
        "grid h-9 shrink-0 select-none border-b",
        controlsOnLeft ? "grid-cols-[auto_minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)_auto]",
        "border-[var(--ui-header-border)] bg-[var(--ui-header-bg)] text-[var(--ui-header-fg)]",
      )}
      onDoubleClick={chrome.toggleMaximize}
    >
      {controlsOnLeft ? windowControls : null}

      <div
        className={cn(
          "window-drag-region flex min-w-0 items-end overflow-x-auto",
          controlsOnLeft ? "col-start-2" : "col-start-1",
        )}
      >
        <button
          type="button"
          className={cn(
            "window-no-drag relative inline-flex h-8 w-9 shrink-0 items-center justify-center border-r",
            "border-[var(--ui-header-border)]",
            isHomeActive
              ? "bg-[var(--ui-panel-bg)] text-[var(--ui-header-fg)]"
              : "bg-[var(--ui-header-bg)]/80 text-[var(--ui-muted-fg)] hover:bg-[var(--ui-panel-bg)]",
          )}
          aria-label={homeLabel}
          title={homeLabel}
          onClick={goHome}
        >
          <Home className="h-3.5 w-3.5" aria-hidden="true" />
          <span
            className={cn(
              "absolute inset-x-0 top-0 h-0.5 transition-opacity",
              isHomeActive ? "opacity-100" : "opacity-0",
              "bg-[var(--ui-header-fg)]",
            )}
            aria-hidden="true"
          />
        </button>

        {visibleTabs.map((tab) => {
          const isActive = tab.id === activeTabId && location.pathname !== "/";
          const tabTitle = displayTabLabel(tab, conversations, locale, {
            activeTabId,
            activeConversationId,
          });
          return (
            <div
              key={tab.id}
              className={cn(
                "window-no-drag group relative flex h-8 max-w-[14rem] shrink-0 items-center gap-1 border-r px-3 text-xs",
                "border-[var(--ui-header-border)]",
                isActive
                  ? "bg-[var(--ui-panel-bg)] text-[var(--ui-header-fg)]"
                  : "bg-[var(--ui-header-bg)]/80 text-[var(--ui-muted-fg)] hover:bg-[var(--ui-panel-bg)]",
              )}
              onClick={() => selectTab(tab)}
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left font-medium"
                title={tabTitle}
              >
                {tabTitle}
              </button>
              {visibleTabs.length > 0 ? (
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100",
                    isActive && "opacity-100",
                    theme === "dark" ? "hover:bg-zinc-700" : "hover:bg-zinc-200",
                  )}
                  aria-label={`Close ${tabTitle}`}
                  onClick={() => closeTab(tab.id)}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              ) : null}
              <span
                className={cn(
                  "absolute inset-x-0 top-0 h-0.5 transition-opacity",
                  isActive ? "opacity-100" : "opacity-0",
                  "bg-[var(--ui-header-fg)]",
                )}
                aria-hidden="true"
              />
            </div>
          );
        })}
        <button
          type="button"
          className={cn(
            "window-no-drag inline-flex h-8 w-8 shrink-0 items-center justify-center border-r text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800",
            theme === "dark" ? "border-zinc-800" : "border-zinc-200",
          )}
          aria-label="New tab"
          title="New tab"
          onClick={() => openNewTab({ path: "/" })}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {!controlsOnLeft ? windowControls : null}
    </header>
  );
}
