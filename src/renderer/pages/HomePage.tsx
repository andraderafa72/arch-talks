import { useCallback, useState } from "react";
import { FileText, FolderOpen, GitBranch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LatexHomePanel } from "@/pages/home/LatexHomePanel";
import { UmlHomePanel } from "@/pages/home/UmlHomePanel";
import { VaultHomePanel } from "@/pages/home/VaultHomePanel";
import { useTemplateDraftContext } from "@/contexts/TemplateDraftContext";
import { requireVaultElectronApi } from "@/lib/electronBridge";
import { useEditorStore } from "@/state/store";
import type { VaultCategory } from "@/types";

type CreateTab = "uml" | "latex" | "vault";

export function HomePage() {
  const navigate = useNavigate();
  const createConversation = useEditorStore((state) => state.createConversation);
  const completeVaultInitialization = useEditorStore((state) => state.completeVaultInitialization);
  const {
    technicalTemplates,
    selectedTemplateId,
    setSelectedTemplateId,
    startTechnicalConversation,
  } = useTemplateDraftContext();

  const [createTab, setCreateTab] = useState<CreateTab>("uml");

  const startUmlConversation = () => {
    createConversation({ kind: "uml" });
    navigate("/workspace");
  };

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
      const result = await api.vaultInitialize({
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
      navigate("/workspace");
    },
    [completeVaultInitialization, createConversation, navigate],
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl p-6 py-8">
        <div className="rounded-xl border border-zinc-200 bg-[#fefefe] p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <h1 className="text-2xl font-semibold">What do you want to create?</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Pick a project type below. Each option opens in its own workspace tab.
          </p>

          <Tabs
            value={createTab}
            onValueChange={(value) => setCreateTab(value as CreateTab)}
            className="mt-5"
          >
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-zinc-100 p-1 dark:bg-zinc-800">
              <TabsTrigger
                value="uml"
                className="gap-1.5 data-[state=active]:bg-white data-[state=active]:text-zinc-900 dark:text-zinc-300 dark:data-[state=active]:bg-zinc-700 dark:data-[state=active]:text-zinc-50"
              >
                <GitBranch className="h-4 w-4 shrink-0" aria-hidden />
                UML
              </TabsTrigger>
              <TabsTrigger
                value="latex"
                className="gap-1.5 data-[state=active]:bg-white data-[state=active]:text-zinc-900 dark:text-zinc-300 dark:data-[state=active]:bg-zinc-700 dark:data-[state=active]:text-zinc-50"
              >
                <FileText className="h-4 w-4 shrink-0" aria-hidden />
                LaTeX
              </TabsTrigger>
              <TabsTrigger
                value="vault"
                className="gap-1.5 data-[state=active]:bg-white data-[state=active]:text-zinc-900 dark:text-zinc-300 dark:data-[state=active]:bg-zinc-700 dark:data-[state=active]:text-zinc-50"
              >
                <FolderOpen className="h-4 w-4 shrink-0" aria-hidden />
                Vault
              </TabsTrigger>
            </TabsList>

            <TabsContent value="uml" className="mt-4 focus-visible:outline-none">
              <UmlHomePanel onCreate={startUmlConversation} />
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
