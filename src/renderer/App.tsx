import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { WindowTabBar } from "@/components/layout/WindowTabBar";
import { TemplateDraftProvider } from "@/contexts/TemplateDraftContext";
import { WindowTabsProvider } from "@/contexts/WindowTabsContext";
import { WorkspaceConversationProvider } from "@/contexts/WorkspaceConversationContext";
import { WorkspaceLayoutProvider } from "@/contexts/WorkspaceLayoutContext";
import { useArchitectureBootstrap } from "@/hooks/useArchitectureBootstrap";
import { useUserPreferencesSync } from "@/hooks/useUserPreferencesSync";
import { ConversationsPage } from "@/pages/ConversationsPage";
import { HomePage } from "@/pages/HomePage";
import { IntegrationsPage } from "@/pages/IntegrationsPage";
import { LatexTectonicPage } from "@/pages/LatexTectonicPage";
import { MarkdownToPdfPage } from "@/pages/MarkdownToPdfPage";
import { TemplatesPage } from "@/pages/TemplatesPage";
import { ThemesPage } from "@/pages/ThemesPage";
import { UmlRenderPage } from "@/pages/UmlRenderPage";
import { VaultSkillsPage } from "@/pages/VaultSkillsPage";
import { DailyReportsPage } from "@/pages/DailyReportsPage";
import { WorkspacePage } from "@/pages/WorkspacePage";
import { useEditorStore } from "@/state/store";

type AppContentProps = {
  theme: "light" | "dark";
};

function AppContent({ theme }: AppContentProps) {
  const navigate = useNavigate();
  useUserPreferencesSync();

  return (
    <>
      <WindowTabBar />
      <TopBar />

      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/workspace" element={<WorkspacePage theme={theme} onGoHome={() => navigate("/")} />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/themes" element={<ThemesPage />} />
          <Route path="/configuration/integrations" element={<IntegrationsPage />} />
          <Route path="/conversations" element={<ConversationsPage />} />
          <Route path="/skills/vaults" element={<VaultSkillsPage />} />
          <Route path="/tools/markdown-pdf" element={<MarkdownToPdfPage theme={theme} />} />
          <Route path="/tools/uml-render" element={<UmlRenderPage theme={theme} />} />
          <Route path="/tools/latex-tectonic" element={<LatexTectonicPage theme={theme} />} />
          <Route path="/daily-reports" element={<DailyReportsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  const navigate = useNavigate();
  const {
    technicalTemplates,
    theme,
    errorMessage,
    hydrateFromBackend,
    clearError,
    createConversation,
    addTechnicalTemplate,
  } = useEditorStore();

  const { ready, initialLayout } = useArchitectureBootstrap({ hydrateFromBackend, clearError });

  const shellClassName = `relative flex h-screen min-h-0 flex-col ${theme === "dark" ? "theme-dark dark" : "theme-light"} text-[var(--ui-shell-fg)]`;

  if (!ready) {
    return (
      <WindowTabsProvider>
        <div
          className={`flex h-screen flex-col ${theme === "dark" ? "theme-dark dark" : "theme-light"} bg-[var(--ui-shell-bg)]`}
        >
          <WindowTabBar />
          <div className="flex flex-1 items-center justify-center text-sm text-[var(--ui-muted-fg)]">
            Loading…
          </div>
        </div>
      </WindowTabsProvider>
    );
  }

  return (
    <WindowTabsProvider>
      <div className={shellClassName}>
        <div className="grid min-h-0 flex-1 grid-rows-[auto_auto_minmax(0,1fr)]">
          <TemplateDraftProvider
            technicalTemplates={technicalTemplates}
            addTechnicalTemplate={addTechnicalTemplate}
            createConversation={createConversation}
            onNavigateToWorkspace={() => navigate("/workspace")}
          >
            <WorkspaceConversationProvider onOpenConversation={() => navigate("/workspace")}>
              <WorkspaceLayoutProvider initialLayout={initialLayout}>
                <AppContent theme={theme} />
              </WorkspaceLayoutProvider>
            </WorkspaceConversationProvider>
          </TemplateDraftProvider>
        </div>

        {errorMessage ? (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-red-600 px-4 py-2 text-sm text-white">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </WindowTabsProvider>
  );
}

export default App;
