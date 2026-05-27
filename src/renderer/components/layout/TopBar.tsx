import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ConversationPicker } from "@/components/layout/ConversationPicker";
import { TopBarHoverMenus } from "@/components/layout/TopBarHoverMenus";
import { useWindowTabsContext } from "@/contexts/WindowTabsContext";
import { useWorkspaceConversationContext } from "@/contexts/WorkspaceConversationContext";
import { listThemes } from "@/lib/themeRegistry";
import { topBarStrings } from "@/lib/uiCopy";
import { useEditorStore } from "@/state/store";
import { Moon, Sun } from "lucide-react";

export type AppMainSection =
  | "editor"
  | "templates"
  | "themes"
  | "configurationIntegrations"
  | "conversations"
  | "skillsVault"
  | "toolMarkdownPdf"
  | "toolUmlRender"
  | "toolLatexTectonic"
  | "toolDailyReports";

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    goHome,
    theme,
    setTheme,
    uiThemeId,
    setUiThemeId,
    customUiThemes,
    locale,
    setLocale,
    technicalTemplates,
  } = useEditorStore();
  const {
    conversationList,
    activeConversationId,
    fileNames,
    hasUnsavedChanges,
  } = useWorkspaceConversationContext();
  const { openNewTab } = useWindowTabsContext();

  const section: AppMainSection = (() => {
    if (location.pathname === "/templates") return "templates";
    if (location.pathname === "/themes") return "themes";
    if (location.pathname === "/configuration/integrations") return "configurationIntegrations";
    if (location.pathname === "/conversations") return "conversations";
    if (location.pathname === "/skills/vaults") return "skillsVault";
    if (location.pathname === "/tools/markdown-pdf") return "toolMarkdownPdf";
    if (location.pathname === "/tools/uml-render") return "toolUmlRender";
    if (location.pathname === "/tools/latex-tectonic") return "toolLatexTectonic";
    if (location.pathname === "/daily-reports") return "toolDailyReports";
    return "editor";
  })();
  const saveStatus = fileNames.some((file) => hasUnsavedChanges(file)) ? "unsaved" : "saved";
  const t = topBarStrings(locale);
  const uiThemes = listThemes(customUiThemes);
  const isToolSection =
    section === "toolMarkdownPdf" ||
    section === "toolUmlRender" ||
    section === "toolLatexTectonic" ||
    section === "toolDailyReports";
  const isWorkspaceSection = section === "editor" || section === "conversations";

  const isSkillsSection = section === "skillsVault";

  const hoverMenus = useMemo(
    () => [
      {
        id: "workspaces",
        label: t.workspaces,
        active: isWorkspaceSection,
        groups: [
          {
            items: [
              {
                id: "workspace-editor",
                label: t.workspaceEditor,
                description: t.workspaceEditorDesc,
                onSelect: () => navigate("/workspace"),
              },
            ],
          },
          {
            heading: t.workspaces,
            items: [
              {
                id: "workspace-latex",
                label: t.latexWorkspaces,
                description: t.latexWorkspacesDesc,
                onSelect: () => navigate("/conversations?kind=technical_document"),
              },
              {
                id: "workspace-uml",
                label: t.umlWorkspaces,
                description: t.umlWorkspacesDesc,
                onSelect: () => navigate("/conversations?kind=uml"),
              },
              {
                id: "workspace-vault",
                label: t.vaultWorkspaces,
                description: t.vaultWorkspacesDesc,
                onSelect: () => navigate("/conversations?kind=vault"),
              },
            ],
          },
          {
            items: [
              {
                id: "workspace-all",
                label: t.allWorkspaces,
                onSelect: () => navigate("/conversations"),
              },
              {
                id: "workspace-new",
                label: t.newProject,
                onSelect: () => {
                  goHome();
                  navigate("/");
                },
              },
            ],
          },
        ],
      },
      {
        id: "tools",
        label: t.tools,
        active: isToolSection,
        groups: [
          {
            items: [
              {
                id: "tool-markdown-pdf",
                label: t.markdownToPdf,
                onSelect: () => navigate("/tools/markdown-pdf"),
              },
              {
                id: "tool-uml",
                label: t.renderUml,
                onSelect: () => navigate("/tools/uml-render"),
              },
              {
                id: "tool-latex",
                label: t.latexTectonic,
                onSelect: () => navigate("/tools/latex-tectonic"),
              },
              {
                id: "tool-daily-reports",
                label: t.dailyReports,
                onSelect: () => navigate("/daily-reports"),
              },
            ],
          },
        ],
      },
      {
        id: "skills",
        label: t.skills,
        active: isSkillsSection,
        groups: [
          {
            heading: t.vaultSkills,
            items: [
              {
                id: "skills-vaults",
                label: t.vaultSkills,
                description: t.vaultSkillsSubtitle,
                onSelect: () => navigate("/skills/vaults"),
              },
            ],
          },
        ],
      },
      {
        id: "config",
        label: t.configuration,
        active:
          section === "templates" ||
          section === "themes" ||
          section === "configurationIntegrations",
        groups: [
          {
            items: [
              {
                id: "config-templates",
                label: t.templates,
                onSelect: () => navigate("/templates"),
              },
              {
                id: "config-integrations",
                label: t.integrations,
                onSelect: () => navigate("/configuration/integrations"),
              },
            ],
          },
          {
            heading: t.appearance,
            items: [
              {
                id: "config-theme-light",
                label: t.lightTheme,
                selected: theme === "light",
                onSelect: () => setTheme("light"),
              },
              {
                id: "config-theme-dark",
                label: t.darkTheme,
                selected: theme === "dark",
                onSelect: () => setTheme("dark"),
              },
            ],
          },
          {
            heading: t.uiThemes,
            items: [
              ...uiThemes.map((uiTheme) => ({
                id: `config-ui-theme-${uiTheme.id}`,
                label: uiTheme.name,
                selected: uiThemeId === uiTheme.id,
                onSelect: () => setUiThemeId(uiTheme.id),
              })),
              {
                id: "config-manage-themes",
                label: t.manageThemes,
                onSelect: () => navigate("/themes"),
              },
            ],
          },
          {
            heading: t.language,
            items: [
              {
                id: "config-locale-en",
                label: "English",
                selected: locale === "en",
                onSelect: () => setLocale("en"),
              },
              {
                id: "config-locale-pt",
                label: "Português",
                selected: locale === "pt",
                onSelect: () => setLocale("pt"),
              },
            ],
          },
        ],
      },
    ],
    [
      goHome,
      isSkillsSection,
      isToolSection,
      isWorkspaceSection,
      locale,
      navigate,
      section,
      setLocale,
      setTheme,
      setUiThemeId,
      customUiThemes,
      uiThemeId,
      uiThemes,
      t,
      theme,
    ],
  );

  return (
    <header className="w-full min-w-0 max-w-full border-b border-[var(--ui-header-border)] bg-[var(--ui-header-bg)] px-3 py-2 text-[var(--ui-header-fg)]">
      <div className="flex w-full min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 overflow-visible">
          <ConversationPicker
            conversations={conversationList}
            activeConversationId={activeConversationId}
            templates={technicalTemplates}
            locale={locale}
            onSelect={(id) => {
              const conversation = conversationList.find((item) => item.id === id);
              openNewTab({
                path: "/workspace",
                conversationId: id,
                label: conversation?.title,
              });
            }}
          />
          <TopBarHoverMenus menus={hoverMenus} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge className="max-w-[6.5rem] truncate border-[var(--ui-header-badge-border)] bg-[var(--ui-header-badge-bg)] text-[var(--ui-header-badge-fg)] sm:max-w-none">
            {saveStatus === "saved" ? t.saved : t.unsaved}
          </Badge>
          <button
            type="button"
            role="switch"
            aria-checked={theme === "dark"}
            aria-label={t.toggleTheme}
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="relative inline-flex h-8 w-16 shrink-0 items-center rounded-full border border-[var(--ui-theme-switch-track-border)] bg-[var(--ui-theme-switch-track-bg)] p-1 transition-colors"
          >
            <span
              className={`absolute left-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ui-theme-switch-thumb-bg)] text-[var(--ui-theme-switch-thumb-fg)] shadow transition-transform ${
                theme === "dark" ? "translate-x-8" : "translate-x-0"
              }`}
            >
              {theme === "dark" ? (
                <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Sun className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
