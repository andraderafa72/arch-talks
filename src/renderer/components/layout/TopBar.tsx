import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkspaceConversationContext } from "@/contexts/WorkspaceConversationContext";
import { topBarStrings } from "@/lib/uiCopy";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/state/store";
import { ChevronDown, Moon, Sun } from "lucide-react";

export type AppMainSection =
  | "editor"
  | "templates"
  | "conversations"
  | "toolMarkdownPdf"
  | "toolUmlRender"
  | "toolLatexTectonic";

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    goHome,
    applyPendingPatch,
    theme,
    setTheme,
    locale,
    setLocale,
  } = useEditorStore();
  const {
    conversationList,
    activeConversationId,
    pendingPatch,
    fileNames,
    hasUnsavedChanges,
    openConversation,
  } = useWorkspaceConversationContext();

  const section: AppMainSection = (() => {
    if (location.pathname === "/templates") return "templates";
    if (location.pathname === "/conversations") return "conversations";
    if (location.pathname === "/tools/markdown-pdf") return "toolMarkdownPdf";
    if (location.pathname === "/tools/uml-render") return "toolUmlRender";
    if (location.pathname === "/tools/latex-tectonic") return "toolLatexTectonic";
    return "editor";
  })();
  const saveStatus = fileNames.some((file) => hasUnsavedChanges(file)) ? "unsaved" : "saved";
  const t = topBarStrings(locale);
  const isToolSection =
    section === "toolMarkdownPdf" || section === "toolUmlRender" || section === "toolLatexTectonic";
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const toolsWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toolsMenuOpen) return;
    const onDocMouseDown = (event: MouseEvent) => {
      const el = toolsWrapRef.current;
      if (el && !el.contains(event.target as Node)) setToolsMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setToolsMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [toolsMenuOpen]);

  return (
    <header className="w-full min-w-0 max-w-full border-b border-zinc-200 bg-[#fefefe] px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950">
      <div className="flex w-full min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 overflow-visible">
          <select
            value={activeConversationId}
            onChange={(event) => openConversation(event.target.value)}
            className="h-9 min-w-0 max-w-[10rem] shrink rounded-md border border-zinc-200 bg-[#fefefe] px-2 text-sm sm:max-w-[14rem] dark:border-zinc-700 dark:bg-zinc-900"
          >
            {conversationList.length === 0 ? (
              <option value="" disabled>
                {t.noConversations}
              </option>
            ) : null}
            {conversationList.map((conversation) => (
              <option key={conversation.id} value={conversation.id}>
                {conversation.title}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => {
              goHome();
              navigate("/");
            }}
          >
            {t.newConversation}
          </Button>
          <Button
            variant={section === "editor" ? "default" : "secondary"}
            size="sm"
            className="shrink-0"
            onClick={() => navigate("/workspace")}
          >
            {t.editorChat}
          </Button>
          <Button
            variant={section === "templates" ? "default" : "secondary"}
            size="sm"
            className="shrink-0"
            onClick={() => navigate("/templates")}
          >
            {t.templates}
          </Button>
          <Button
            variant={section === "conversations" ? "default" : "secondary"}
            size="sm"
            className="shrink-0"
            onClick={() => navigate("/conversations")}
          >
            {t.conversations}
          </Button>

          <div ref={toolsWrapRef} className="relative z-[100] shrink-0">
            <button
              type="button"
              className={cn(
                "inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors",
                toolsMenuOpen || isToolSection
                  ? "border-zinc-300 bg-zinc-100 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  : "border-transparent bg-transparent text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
              )}
              aria-expanded={toolsMenuOpen}
              aria-haspopup="menu"
              onClick={() => setToolsMenuOpen((open) => !open)}
            >
              {t.tools}
              <ChevronDown
                className={cn("h-4 w-4 opacity-70 transition-transform", toolsMenuOpen && "rotate-180")}
                aria-hidden="true"
              />
            </button>
            {toolsMenuOpen ? (
              <div
                className="absolute left-0 top-full z-[200] mt-1 min-w-[12rem] rounded-md border border-zinc-200 bg-[#fefefe] py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    navigate("/tools/markdown-pdf");
                    setToolsMenuOpen(false);
                  }}
                >
                  {t.markdownToPdf}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    navigate("/tools/uml-render");
                    setToolsMenuOpen(false);
                  }}
                >
                  {t.renderUml}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    navigate("/tools/latex-tectonic");
                    setToolsMenuOpen(false);
                  }}
                >
                  {t.latexTectonic}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge className="max-w-[6.5rem] truncate sm:max-w-none">{saveStatus === "saved" ? t.saved : t.unsaved}</Badge>
          <button
            type="button"
            role="switch"
            aria-checked={theme === "dark"}
            aria-label={t.toggleTheme}
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="relative inline-flex h-8 w-16 shrink-0 items-center rounded-full border border-zinc-300 bg-zinc-100 p-1 transition-colors dark:border-zinc-600 dark:bg-zinc-800"
          >
            <span
              className={cn(
                "absolute left-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-zinc-700 shadow transition-transform dark:bg-zinc-900 dark:text-zinc-200",
                theme === "dark" ? "translate-x-8" : "translate-x-0",
              )}
            >
              {theme === "dark" ? (
                <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Sun className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </span>
          </button>
          <select
            id="topbar-locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value as "en" | "pt")}
            className="h-9 w-[7.5rem] shrink-0 rounded-md border border-zinc-200 bg-[#fefefe] px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            aria-label={t.languageSelect}
          >
            <option value="en">English</option>
            <option value="pt">Português</option>
          </select>
          <Button
            variant={Boolean(pendingPatch) ? "default" : "secondary"}
            className="shrink-0"
            disabled={!pendingPatch}
            onClick={() => applyPendingPatch("Apply AI suggested patch")}
          >
            {t.applyPatch}
          </Button>
        </div>
      </div>
    </header>
  );
}
