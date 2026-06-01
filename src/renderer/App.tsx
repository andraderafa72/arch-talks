import { Navigate, Route, Routes } from "react-router-dom";
import { SettingsHubLayout } from "@/components/configuration/settings/SettingsHubLayout";
import {
  DEFAULT_SETTINGS_PATH,
  SETTINGS_BASE_PATH,
} from "@/components/configuration/settings/settingsRoutes";
import {
  DailyReportsSettingsSection,
  GeneralSettingsPanel,
  LatexSettingsSection,
  LatexTectonicSettingsSection,
  MarkdownPdfSettingsSection,
  SystemDesignSettingsSection,
  SystemPromptsSettingsSection,
  UmlRenderSettingsSection,
  VaultSettingsSection,
} from "@/components/configuration/settings/settingsRouteElements";
import { TopBar } from "@/components/layout/TopBar";
import { WindowTabBar } from "@/components/layout/WindowTabBar";
import { TemplateDraftProvider } from "@/contexts/TemplateDraftContext";
import { useWindowTabsContext, WindowTabsProvider } from "@/contexts/WindowTabsContext";
import { WorkspaceConversationProvider } from "@/contexts/WorkspaceConversationContext";
import { WorkspaceLayoutProvider } from "@/contexts/WorkspaceLayoutContext";
import { useArchitectureBootstrap } from "@/hooks/useArchitectureBootstrap";
import { useUserPreferencesSync } from "@/hooks/useUserPreferencesSync";
import { useSpeechModelSync } from "@/hooks/useSpeechModelSync";
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
import type { WorkspaceLayoutPreferences } from "@/types/userPreferences";

type AppContentProps = {
  theme: "light" | "dark";
};

function AppContent({ theme }: AppContentProps) {
  const { goHome } = useWindowTabsContext();
  useUserPreferencesSync();
  useSpeechModelSync();

  return (
    <>
      <WindowTabBar />
      <TopBar />

      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/workspace" element={<WorkspacePage theme={theme} onGoHome={goHome} />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/themes" element={<ThemesPage />} />
          <Route path="/configuration/integrations" element={<IntegrationsPage />} />
          <Route path={SETTINGS_BASE_PATH} element={<Navigate to={DEFAULT_SETTINGS_PATH} replace />} />
          <Route element={<SettingsHubLayout />}>
            <Route path={`${SETTINGS_BASE_PATH}/general`} element={<GeneralSettingsPanel />} />
            <Route path={`${SETTINGS_BASE_PATH}/system-prompts`} element={<SystemPromptsSettingsSection />} />
            <Route path={`${SETTINGS_BASE_PATH}/system-design`} element={<SystemDesignSettingsSection />} />
            <Route path={`${SETTINGS_BASE_PATH}/latex`} element={<LatexSettingsSection />} />
            <Route path={`${SETTINGS_BASE_PATH}/vault`} element={<VaultSettingsSection />} />
            <Route path={`${SETTINGS_BASE_PATH}/markdown-pdf`} element={<MarkdownPdfSettingsSection />} />
            <Route path={`${SETTINGS_BASE_PATH}/uml-render`} element={<UmlRenderSettingsSection />} />
            <Route path={`${SETTINGS_BASE_PATH}/latex-tectonic`} element={<LatexTectonicSettingsSection />} />
            <Route path={`${SETTINGS_BASE_PATH}/daily-reports`} element={<DailyReportsSettingsSection />} />
          </Route>
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

type AppProvidersProps = {
  theme: "light" | "dark";
  initialLayout: WorkspaceLayoutPreferences;
  technicalTemplates: ReturnType<typeof useEditorStore.getState>["technicalTemplates"];
  createConversation: ReturnType<typeof useEditorStore.getState>["createConversation"];
  addTechnicalTemplate: ReturnType<typeof useEditorStore.getState>["addTechnicalTemplate"];
};

function AppProviders({
  theme,
  initialLayout,
  technicalTemplates,
  createConversation,
  addTechnicalTemplate,
}: AppProvidersProps) {
  const { openWorkspace } = useWindowTabsContext();

  return (
    <TemplateDraftProvider
      technicalTemplates={technicalTemplates}
      addTechnicalTemplate={addTechnicalTemplate}
      createConversation={createConversation}
      onOpenWorkspace={openWorkspace}
    >
      <WorkspaceConversationProvider onOpenConversation={openWorkspace}>
        <WorkspaceLayoutProvider initialLayout={initialLayout}>
          <AppContent theme={theme} />
        </WorkspaceLayoutProvider>
      </WorkspaceConversationProvider>
    </TemplateDraftProvider>
  );
}

function App() {
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
          <AppProviders
            theme={theme}
            initialLayout={initialLayout}
            technicalTemplates={technicalTemplates}
            createConversation={createConversation}
            addTechnicalTemplate={addTechnicalTemplate}
          />
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
