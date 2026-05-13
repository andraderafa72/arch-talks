import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { TemplateDraftProvider } from "@/contexts/TemplateDraftContext";
import { WorkspaceConversationProvider } from "@/contexts/WorkspaceConversationContext";
import { WorkspaceLayoutProvider } from "@/contexts/WorkspaceLayoutContext";
import { useArchitectureBootstrap } from "@/hooks/useArchitectureBootstrap";
import { ConversationsPage } from "@/pages/ConversationsPage";
import { HomePage } from "@/pages/HomePage";
import { LatexTectonicPage } from "@/pages/LatexTectonicPage";
import { MarkdownToPdfPage } from "@/pages/MarkdownToPdfPage";
import { TemplatesPage } from "@/pages/TemplatesPage";
import { UmlRenderPage } from "@/pages/UmlRenderPage";
import { WorkspacePage } from "@/pages/WorkspacePage";
import { useEditorStore } from "@/state/store";

type AppContentProps = {
  theme: "light" | "dark";
};

function AppContent({ theme }: AppContentProps) {
  const navigate = useNavigate();

  return (
    <>
      <TopBar />

      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <WorkspaceLayoutProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/workspace" element={<WorkspacePage theme={theme} onGoHome={() => navigate("/")} />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/conversations" element={<ConversationsPage />} />
            <Route path="/tools/markdown-pdf" element={<MarkdownToPdfPage theme={theme} />} />
            <Route path="/tools/uml-render" element={<UmlRenderPage theme={theme} />} />
            <Route path="/tools/latex-tectonic" element={<LatexTectonicPage theme={theme} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </WorkspaceLayoutProvider>
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

  useArchitectureBootstrap({ hydrateFromBackend, clearError });

  return (
    <div
      className={`relative flex h-screen min-h-0 flex-col ${theme === "dark" ? "theme-dark dark" : "theme-light"} text-zinc-900 dark:text-zinc-100`}
    >
      <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]">
        <TemplateDraftProvider
          technicalTemplates={technicalTemplates}
          addTechnicalTemplate={addTechnicalTemplate}
          createConversation={createConversation}
          onNavigateToWorkspace={() => navigate("/workspace")}
        >
          <WorkspaceConversationProvider onOpenConversation={() => navigate("/workspace")}>
            <AppContent theme={theme} />
          </WorkspaceConversationProvider>
        </TemplateDraftProvider>
      </div>

      {errorMessage ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-red-600 px-4 py-2 text-sm text-white">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}

export default App;
