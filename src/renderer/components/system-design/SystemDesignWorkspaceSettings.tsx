import { useCallback, useEffect, useState } from "react";
import { FolderPlus, Settings, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isLocalAgentSelection, localAgentFolderScanHint } from "@/lib/localAgentSelection";
import { useEditorStore } from "@/state/store";
import type { UiLocale } from "@/types";
import type { LocalAiProviderOption, LocalAiSelection } from "@/types/electron-api";

type SystemDesignWorkspaceSettingsProps = {
  documentId: string;
  locale: UiLocale;
  effectiveScanFolderPath?: string;
  referencePaths?: string[];
  aiSelection?: LocalAiSelection;
  hasSystemMd: boolean;
  onClose: () => void;
};

export function SystemDesignWorkspaceSettings({
  documentId,
  locale,
  effectiveScanFolderPath,
  referencePaths = [],
  aiSelection,
  hasSystemMd,
  onClose,
}: SystemDesignWorkspaceSettingsProps) {
  const setSystemDesignScanFolder = useEditorStore((s) => s.setSystemDesignScanFolder);
  const addSystemDesignReferencePath = useEditorStore((s) => s.addSystemDesignReferencePath);
  const removeSystemDesignReferencePath = useEditorStore((s) => s.removeSystemDesignReferencePath);
  const completeSystemContext = useEditorStore((s) => s.completeSystemContext);
  const systemDesignRootPath = useEditorStore(
    (s) => s.conversations[documentId]?.systemDesignRootPath,
  );
  const currentFiles = useEditorStore((s) => s.conversations[documentId]?.files ?? {});
  const systemPromptRevision = useEditorStore((s) => s.conversations[documentId]?.systemPromptRevision ?? 0);
  const globalPromptRevision = useEditorStore((s) => s.globalPromptRevision);
  const [providers, setProviders] = useState<LocalAiProviderOption[]>([]);
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    const api = window.electronApi;
    if (!api?.aiListLocalOptions) return;
    void api.aiListLocalOptions().then((opts) => setProviders(opts.providers));
    if (api.systemDesignGetChatFolderPath) {
      void api.systemDesignGetChatFolderPath(documentId).then((r) => setWorkspaceRoot(r.path));
    }
  }, [documentId]);

  const canScanFolder = isLocalAgentSelection(aiSelection, providers);

  const pickDirectory = useCallback(async (): Promise<string | null> => {
    const api = window.electronApi;
    if (!api?.pickDirectory) return null;
    const result = await api.pickDirectory();
    return result.ok ? result.path : null;
  }, []);

  const handleAddReferencePath = useCallback(async () => {
    const path = await pickDirectory();
    if (path) addSystemDesignReferencePath(path);
  }, [addSystemDesignReferencePath, pickDirectory]);

  const handleSetScanFolder = useCallback(async () => {
    if (!canScanFolder) return;
    const path = await pickDirectory();
    if (path) setSystemDesignScanFolder(documentId, path);
  }, [canScanFolder, documentId, pickDirectory, setSystemDesignScanFolder]);

  const handleRegenerateFromFolder = useCallback(async () => {
    if (!canScanFolder || !hasSystemMd) return;
    const path = await pickDirectory();
    if (!path) return;
    const confirmed = window.confirm(
      locale === "pt"
        ? `Regenerar SYSTEM.md a partir de ${path}? Isto substitui o conteúdo atual.`
        : `Regenerate SYSTEM.md from ${path}? This replaces the current content.`,
    );
    if (!confirmed) return;

    const api = window.electronApi;
    if (!api?.systemDesignMaterializeSystemMd) return;
    setRegenerating(true);
    setSystemDesignScanFolder(documentId, path);
    try {
      const response = await api.systemDesignMaterializeSystemMd({
        sessionKey: `system-context:${documentId}:regen:g${globalPromptRevision}:p${systemPromptRevision}`,
        documentId,
        messages: [
          {
            role: "user",
            content:
              locale === "pt"
                ? `Gere o SYSTEM.md analisando o projeto na pasta: ${path}`
                : `Generate SYSTEM.md by analyzing the project in the folder: ${path}`,
          },
        ],
        aiSelection,
        scanFolderPath: path,
        files: currentFiles,
      });
      completeSystemContext(documentId, response);
    } finally {
      setRegenerating(false);
    }
  }, [
    aiSelection,
    canScanFolder,
    completeSystemContext,
    currentFiles,
    documentId,
    hasSystemMd,
    locale,
    pickDirectory,
    setSystemDesignScanFolder,
    globalPromptRevision,
    systemPromptRevision,
  ]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div
        className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-[#fefefe] shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-labelledby="system-design-settings-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-zinc-500" aria-hidden />
            <h2 id="system-design-settings-title" className="text-sm font-semibold">
              {locale === "pt" ? "Definições do espaço" : "Workspace settings"}
            </h2>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {systemDesignRootPath ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {locale === "pt" ? "Pasta do projeto" : "Project folder"}
              </h3>
              <p className="mt-1 break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">
                {systemDesignRootPath}
              </p>
            </section>
          ) : null}

          {workspaceRoot ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {locale === "pt" ? "Pasta do espaço" : "Workspace folder"}
              </h3>
              <p className="mt-1 break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">{workspaceRoot}</p>
            </section>
          ) : null}

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {locale === "pt" ? "Pastas de referência (@)" : "Reference paths (@)"}
            </h3>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {locale === "pt"
                ? "Pastas adicionais indexadas para menções @ no chat."
                : "Additional folders indexed for @ mentions in chat."}
            </p>
            <ul className="mt-2 space-y-1">
              {referencePaths.map((path) => (
                <li
                  key={path}
                  className="flex items-center gap-2 rounded-md border border-zinc-200 px-2 py-1.5 text-xs dark:border-zinc-700"
                >
                  <span className="min-w-0 flex-1 truncate font-mono">{path}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeSystemDesignReferencePath(path)}
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
            <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => void handleAddReferencePath()}>
              <FolderPlus className="mr-1.5 h-3.5 w-3.5" />
              {locale === "pt" ? "Adicionar pasta" : "Add folder"}
            </Button>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {locale === "pt" ? "Pasta de análise (agente)" : "Agent scan folder"}
            </h3>
            {canScanFolder ? (
              <>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {effectiveScanFolderPath ? (
                    <code className="font-mono">{effectiveScanFolderPath}</code>
                  ) : locale === "pt" ? (
                    "Nenhuma pasta selecionada."
                  ) : (
                    "No folder selected."
                  )}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => void handleSetScanFolder()}>
                    {locale === "pt" ? "Escolher pasta" : "Choose folder"}
                  </Button>
                  {effectiveScanFolderPath ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setSystemDesignScanFolder(documentId, undefined)}>
                      {locale === "pt" ? "Limpar" : "Clear"}
                    </Button>
                  ) : null}
                  {hasSystemMd ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={regenerating}
                      onClick={() => void handleRegenerateFromFolder()}
                    >
                      {regenerating
                        ? locale === "pt"
                          ? "A regenerar…"
                          : "Regenerating…"
                        : locale === "pt"
                          ? "Regenerar SYSTEM.md da pasta"
                          : "Regenerate SYSTEM.md from folder"}
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">{localAgentFolderScanHint(locale)}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
