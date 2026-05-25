import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useWindowTabsContext } from "@/contexts/WindowTabsContext";
import { displayTabLabel, isHomeTab } from "@/lib/windowTabs";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/state/store";
import { Copy, Home, Minus, Plus, Square, X } from "lucide-react";

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

  const windowControls = (
    <div className="window-no-drag flex shrink-0 items-center gap-0.5 px-1.5">
      <button
        type="button"
        className="inline-flex h-7 w-8 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
        aria-label="Minimize window"
        onClick={chrome.minimize}
      >
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="inline-flex h-7 w-8 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
        aria-label={chrome.isMaximized ? "Restore window" : "Maximize window"}
        onClick={chrome.toggleMaximize}
      >
        {chrome.isMaximized ? (
          <Copy className="h-3 w-3" aria-hidden="true" />
        ) : (
          <Square className="h-3 w-3" aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        className="inline-flex h-7 w-8 items-center justify-center rounded-md text-zinc-600 hover:bg-red-500 hover:text-white dark:text-zinc-300 dark:hover:bg-red-600"
        aria-label="Close window"
        onClick={chrome.close}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <header
      className={cn(
        "grid h-9 shrink-0 select-none border-b",
        controlsOnLeft ? "grid-cols-[auto_minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)_auto]",
        theme === "dark"
          ? "border-zinc-800 bg-zinc-950 text-zinc-100"
          : "border-zinc-200 bg-[#f4f4f5] text-zinc-900",
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
            theme === "dark" ? "border-zinc-800" : "border-zinc-200",
            isHomeActive
              ? theme === "dark"
                ? "bg-zinc-900 text-zinc-100"
                : "bg-[#fefefe] text-zinc-900"
              : theme === "dark"
                ? "bg-zinc-950/80 text-zinc-400 hover:bg-zinc-900/70"
                : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-100",
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
              theme === "dark" ? "bg-zinc-100" : "bg-zinc-900",
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
                theme === "dark" ? "border-zinc-800" : "border-zinc-200",
                isActive
                  ? theme === "dark"
                    ? "bg-zinc-900 text-zinc-100"
                    : "bg-[#fefefe] text-zinc-900"
                  : theme === "dark"
                    ? "bg-zinc-950/80 text-zinc-400 hover:bg-zinc-900/70"
                    : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-100",
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
                  theme === "dark" ? "bg-zinc-100" : "bg-zinc-900",
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
