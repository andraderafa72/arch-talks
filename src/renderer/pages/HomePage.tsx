import { useCallback, useState } from "react";
import { FileText, FolderOpen, GitBranch } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWindowTabsContext } from "@/contexts/WindowTabsContext";
import { useTemplateDraftContext } from "@/contexts/TemplateDraftContext";
import { LatexHomePanel } from "@/pages/home/LatexHomePanel";
import { SystemDesignHomePanel } from "@/pages/home/SystemDesignHomePanel";
import { VaultHomePanel } from "@/pages/home/VaultHomePanel";
import { getElectronApi, requireVaultElectronApi } from "@/lib/electronBridge";
import { useEditorStore } from "@/state/store";
import type { VaultCategory } from "@/types";
import type { ElectronApi, SystemDesignInitializeRequest, SystemDesignInitializeResponse } from "@/types/electron-api";

type CreateTab = "system_design" | "latex" | "vault";

type SystemDesignElectronApi = ElectronApi & {
  systemDesignInitialize: (req: SystemDesignInitializeRequest) => Promise<SystemDesignInitializeResponse>;
};

function requireSystemDesignElectronApi(): SystemDesignElectronApi {
  const api = getElectronApi();
  if (!api?.systemDesignInitialize) {
    throw new Error(
      "System design IPC is missing from the preload bridge. Stop the app, run npm run build:electron, then start again with npm run dev.",
    );
  }
  return api as SystemDesignElectronApi;
}

export function HomePage() {
  const createConversation = useEditorStore((state) => state.createConversation);
  const completeVaultInitialization = useEditorStore((state) => state.completeVaultInitialization);
  const completeSystemDesignInitialization = useEditorStore(
    (state) => state.completeSystemDesignInitialization,
  );
  const { openNewTab } = useWindowTabsContext();
  const {
    technicalTemplates,
    selectedTemplateId,
    setSelectedTemplateId,
    startTechnicalConversation,
  } = useTemplateDraftContext();

  const [createTab, setCreateTab] = useState<CreateTab>("system_design");

  const startSystemDesignConversation = useCallback(
    async (options: {
      projectName: string;
      locationMode: "existing" | "new";
      existingRootPath: string;
      parentPath: string;
      newFolderName: string;
    }) => {
      const api = requireSystemDesignElectronApi();

      createConversation({
        kind: "system_design",
        projectName: options.projectName,
        saveFolderPath:
          options.locationMode === "existing"
            ? options.existingRootPath
            : `${options.parentPath.replace(/[/\\]+$/, "")}/${options.newFolderName}`,
      });
      const documentId = useEditorStore.getState().activeConversationId;
      const result = await api.systemDesignInitialize({
        documentId,
        name: options.projectName,
        mode: options.locationMode,
        existingRootPath:
          options.locationMode === "existing" ? options.existingRootPath : undefined,
        parentPath: options.locationMode === "new" ? options.parentPath : undefined,
        newFolderName: options.locationMode === "new" ? options.newFolderName : undefined,
      });
      completeSystemDesignInitialization(documentId, {
        title: options.projectName,
        systemDesignRootPath: result.rootPath,
        files: result.files,
        activeFile: result.activeFile,
      });
      openNewTab({
        path: "/workspace",
        conversationId: documentId,
        label: options.projectName,
      });
    },
    [completeSystemDesignInitialization, createConversation, openNewTab],
  );

  const startVaultConversation = useCallback(
    async (options: {
      vaultName: string;
      category: VaultCategory;
      locationMode: "existing" | "new";
      existingRootPath: string;
      parentPath: string;
      newFolderName: string;
    }) => {
      const api = requireVaultElectronApi();

      createConversation({ kind: "vault", vaultName: options.vaultName });
      const documentId = useEditorStore.getState().activeConversationId;
      const result = await api.vaultInitialize!({
        documentId,
        name: options.vaultName,
        category: options.category,
        mode: options.locationMode,
        existingRootPath:
          options.locationMode === "existing" ? options.existingRootPath.trim() : undefined,
        parentPath: options.locationMode === "new" ? options.parentPath.trim() : undefined,
        newFolderName: options.locationMode === "new" ? options.newFolderName.trim() : undefined,
      });
      completeVaultInitialization(documentId, {
        title: options.vaultName,
        vaultName: options.vaultName,
        vaultRootPath: result.vaultRootPath,
        vaultCategory: result.vaultCategory,
        files: result.files,
        diskPaths: result.diskPaths,
        activeFile: result.activeFile,
      });
      openNewTab({
        path: "/workspace",
        conversationId: documentId,
        label: options.vaultName,
      });
    },
    [completeVaultInitialization, createConversation, openNewTab],
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl p-6 py-8">
        <div className="rounded-xl border border-[var(--ui-panel-border)] bg-[var(--ui-panel-bg)] p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-[var(--ui-shell-fg)]">What do you want to create?</h1>
          <p className="mt-2 text-sm text-[var(--ui-muted-fg)]">
            Pick a project type below. Each option opens in its own workspace tab.
          </p>

          <Tabs
            value={createTab}
            onValueChange={(value) => setCreateTab(value as CreateTab)}
            className="mt-5"
          >
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1">
              <TabsTrigger value="system_design" className="gap-1.5">
                <GitBranch className="h-4 w-4 shrink-0" aria-hidden />
                System design
              </TabsTrigger>
              <TabsTrigger value="latex" className="gap-1.5">
                <FileText className="h-4 w-4 shrink-0" aria-hidden />
                LaTeX
              </TabsTrigger>
              <TabsTrigger value="vault" className="gap-1.5">
                <FolderOpen className="h-4 w-4 shrink-0" aria-hidden />
                Vault
              </TabsTrigger>
            </TabsList>

            <TabsContent value="system_design" className="mt-4 focus-visible:outline-none">
              <SystemDesignHomePanel onCreate={startSystemDesignConversation} />
            </TabsContent>

            <TabsContent value="latex" className="mt-4 focus-visible:outline-none">
              <LatexHomePanel
                technicalTemplates={technicalTemplates}
                selectedTemplateId={selectedTemplateId}
                onTemplateChange={setSelectedTemplateId}
                onCreate={startTechnicalConversation}
              />
            </TabsContent>

            <TabsContent value="vault" className="mt-4 focus-visible:outline-none">
              <VaultHomePanel onCreate={startVaultConversation} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
