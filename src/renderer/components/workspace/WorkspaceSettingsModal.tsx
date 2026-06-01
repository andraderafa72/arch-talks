import { useCallback, useEffect, useMemo, useState } from "react";
import { Settings, Trash2, X } from "lucide-react";
import { PromptOverridesEditor } from "@/components/prompts/PromptOverridesEditor";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/state/store";
import type { Conversation, UiLocale } from "@/types";

type WorkspaceSettingsModalProps = {
  conversation: Conversation;
  activeFile: string;
  files: Record<string, string>;
  locale: UiLocale;
  onClose: () => void;
  onDeleted: () => void;
};

export function WorkspaceSettingsModal({
  conversation,
  activeFile,
  files,
  locale,
  onClose,
  onDeleted,
}: WorkspaceSettingsModalProps) {
  const setSystemPromptRevision = useEditorStore((s) => s.setSystemPromptRevision);
  const deleteConversation = useEditorStore((s) => s.deleteConversation);
  const setVaultReferenceFolder = useEditorStore((s) => s.setVaultReferenceFolder);
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null);
  const [deleteExternalRoot, setDeleteExternalRoot] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const externalRoot =
    conversation.kind === "vault"
      ? conversation.vaultRootPath
      : conversation.kind === "system_design"
        ? conversation.systemDesignRootPath
        : undefined;
  const promptPreviewContext = useMemo(
    () => ({
      activeFile,
      files,
      systemMd: files["SYSTEM.md"],
      scanFolderPath: conversation.scanFolderPath,
      vaultCategory: conversation.vaultCategory,
      vaultName: conversation.vaultName,
    }),
    [activeFile, conversation.scanFolderPath, conversation.vaultCategory, conversation.vaultName, files],
  );

  useEffect(() => {
    const api = window.electronApi;
    if (!api?.systemDesignGetChatFolderPath) return;
    void api.systemDesignGetChatFolderPath(conversation.id).then((r) => setWorkspaceRoot(r.path));
  }, [conversation.id]);

  const handlePickVaultReference = useCallback(async () => {
    const api = window.electronApi;
    if (!api?.vaultPickReferenceFolder) return;
    const picked = await api.vaultPickReferenceFolder();
    if (!picked.ok) return;
    let excerpt: string | undefined;
    if (api.vaultScanReferenceFolder) {
      excerpt = (await api.vaultScanReferenceFolder(picked.path)).excerpt;
    }
    setVaultReferenceFolder(picked.path, excerpt);
  }, [setVaultReferenceFolder]);

  const handlePromptRevisionChange = useCallback(
    (revision: number) => setSystemPromptRevision(conversation.id, revision),
    [conversation.id, setSystemPromptRevision],
  );

  const handleDeleteWorkspace = useCallback(async () => {
    if (deleteConfirm !== conversation.title) return;
    const api = window.electronApi;
    if (!api?.deleteDocument) return;
    const confirmed = window.confirm(
      locale === "pt"
        ? `Apagar a workspace "${conversation.title}"? Esta ação não pode ser desfeita.`
        : `Delete workspace "${conversation.title}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    await api.deleteDocument(conversation.id, { deleteExternalRoot });
    deleteConversation(conversation.id);
    onDeleted();
  }, [conversation.id, conversation.title, deleteConfirm, deleteConversation, deleteExternalRoot, locale, onDeleted]);

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[var(--ui-panel-border)] bg-[var(--ui-panel-bg)] text-[var(--ui-shell-fg)] shadow-lg">
        <div className="flex items-center justify-between border-b border-[var(--ui-panel-border)] bg-[var(--ui-header-bg)] px-4 py-3 text-[var(--ui-header-fg)]">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-[var(--ui-muted-fg)]" aria-hidden />
            <h2 className="text-sm font-semibold">
              {locale === "pt" ? "Definições da workspace" : "Workspace settings"}
            </h2>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <PromptOverridesEditor
          scope="document"
          documentId={conversation.id}
          catalogKind={conversation.kind}
          locale={locale}
          previewContext={promptPreviewContext}
          onRevisionChange={handlePromptRevisionChange}
          sidebarHeader={
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted-fg)]">
                {locale === "pt" ? "Workspace" : "Workspace"}
              </h3>
              <p className="break-all text-xs text-[var(--ui-shell-fg)]">{conversation.title}</p>
              <p className="break-all font-mono text-[11px] text-[var(--ui-muted-fg)]">{workspaceRoot}</p>
              {externalRoot ? (
                <p className="break-all font-mono text-[11px] text-[var(--ui-muted-fg)]">{externalRoot}</p>
              ) : null}
              {conversation.kind === "vault" ? (
                <div className="space-y-2 rounded-md border border-[var(--ui-panel-border)] bg-[var(--ui-panel-bg)] p-2 text-xs">
                  <p>Category: {conversation.vaultCategory ?? "unset"}</p>
                  <p className="break-all">Reference: {conversation.referenceFolderPath ?? "(none)"}</p>
                  <Button type="button" size="sm" variant="secondary" onClick={handlePickVaultReference}>
                    {locale === "pt" ? "Escolher referência" : "Pick reference"}
                  </Button>
                </div>
              ) : null}
            </section>
          }
          footer={
            <section className="rounded-md border border-red-200 p-3 dark:border-red-900">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300">
                <Trash2 className="h-4 w-4" />
                {locale === "pt" ? "Zona de perigo" : "Danger zone"}
              </div>
              {externalRoot ? (
                <label className="mt-3 flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={deleteExternalRoot}
                    onChange={(e) => setDeleteExternalRoot(e.target.checked)}
                  />
                  {locale === "pt"
                    ? "Apagar também a pasta externa no disco"
                    : "Also delete the external folder on disk"}
                </label>
              ) : null}
              <input
                className="mt-3 w-full rounded-md border border-[var(--ui-panel-border)] bg-[var(--ui-shell-bg)] px-2 py-1.5 text-sm text-[var(--ui-shell-fg)] outline-none placeholder:text-[var(--ui-muted-fg)] focus:ring-2 focus:ring-[var(--ui-border)]"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={conversation.title}
              />
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="mt-2"
                disabled={deleteConfirm !== conversation.title}
                onClick={handleDeleteWorkspace}
              >
                {locale === "pt" ? "Apagar workspace" : "Delete workspace"}
              </Button>
            </section>
          }
        />
      </div>
    </div>
  );
}
