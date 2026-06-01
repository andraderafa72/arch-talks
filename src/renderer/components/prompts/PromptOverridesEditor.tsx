import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { ConversationKind, UiLocale } from "@/types";
import type {
  PromptCatalogItem,
  PromptId,
  PromptOverridePreviewResponse,
  PromptOverrideSnapshot,
  PromptOverridesManifest,
  VaultCategory,
} from "@/types/electron-api";

type PromptPreviewContext = {
  activeFile?: string;
  files?: Record<string, string>;
  systemMd?: string;
  scanFolderPath?: string;
  vaultCategory?: VaultCategory;
  vaultName?: string;
  structureReport?: string;
};

type PromptOverridesEditorProps = {
  scope: "global" | "document";
  documentId?: string;
  catalogKind?: ConversationKind;
  locale: UiLocale;
  previewContext?: PromptPreviewContext;
  sidebarHeader?: ReactNode;
  footer?: ReactNode;
  note?: ReactNode;
  onRevisionChange: (revision: number) => void;
};

function promptContentFor(snapshot: PromptOverrideSnapshot | null, promptId: PromptId, segmentId?: string): string {
  const content = snapshot?.contents[promptId];
  return segmentId ? content?.segments?.[segmentId] ?? "" : content?.full ?? "";
}

function revisionOf(manifest: PromptOverridesManifest | PromptOverrideSnapshot | null): number {
  if (!manifest) return 0;
  if ("manifest" in manifest) return manifest.manifest.revision;
  return manifest.revision;
}

function kindLabel(kind: ConversationKind): string {
  if (kind === "technical_document") return "LaTeX";
  if (kind === "system_design") return "System design";
  return "Vault";
}

export function PromptOverridesEditor({
  scope,
  documentId,
  catalogKind,
  locale,
  previewContext,
  sidebarHeader,
  footer,
  note,
  onRevisionChange,
}: PromptOverridesEditorProps) {
  const [catalog, setCatalog] = useState<PromptCatalogItem[]>([]);
  const [snapshot, setSnapshot] = useState<PromptOverrideSnapshot | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<PromptId | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [overrideText, setOverrideText] = useState("");
  const [preview, setPreview] = useState<PromptOverridePreviewResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPrompt = useMemo(
    () => catalog.find((item) => item.id === selectedPromptId) ?? catalog[0],
    [catalog, selectedPromptId],
  );

  const selectedSegment = useMemo(
    () => selectedPrompt?.segments.find((segment) => segment.id === selectedSegmentId),
    [selectedPrompt, selectedSegmentId],
  );
  const selectedSegmentIsDynamic = Boolean(selectedSegment?.dynamic);
  const promptEntry = selectedPrompt ? snapshot?.manifest.prompts[selectedPrompt.id] : undefined;
  const segmentEntry = selectedPrompt && selectedSegmentId ? promptEntry?.segments?.[selectedSegmentId] : undefined;
  const overrideEnabled = selectedSegmentId ? Boolean(segmentEntry?.enabled) : Boolean(promptEntry?.enabled);

  const manifestScope = useCallback(() => {
    if (scope === "global") return ["global"] as const;
    if (!documentId) throw new Error("documentId is required for document prompt overrides");
    return ["document", documentId] as const;
  }, [documentId, scope]);

  const reload = useCallback(async () => {
    const api = window.electronApi;
    if (!api?.promptOverridesListCatalog || !api.promptOverridesReadManifest) return;
    const [scopeArg, docId] = manifestScope();
    const [items, nextSnapshot] = await Promise.all([
      api.promptOverridesListCatalog(catalogKind),
      api.promptOverridesReadManifest(scopeArg, docId),
    ]);
    setCatalog(items);
    setSnapshot(nextSnapshot);
    onRevisionChange(nextSnapshot.manifest.revision);
    setSelectedPromptId((current) => current ?? items[0]?.id ?? null);
  }, [catalogKind, manifestScope, onRevisionChange]);

  useEffect(() => {
    void reload().catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [reload]);

  useEffect(() => {
    if (!selectedPrompt) return;
    setOverrideText(promptContentFor(snapshot, selectedPrompt.id, selectedSegmentId ?? undefined));
  }, [selectedPrompt, selectedSegmentId, snapshot]);

  const loadPreview = useCallback(async () => {
    const api = window.electronApi;
    if (!api?.promptOverridesPreview || !selectedPrompt) return;
    const next = await api.promptOverridesPreview({
      scope,
      ...(scope === "document" ? { documentId } : {}),
      promptId: selectedPrompt.id,
      ...previewContext,
    });
    setPreview(next);
  }, [documentId, previewContext, scope, selectedPrompt]);

  useEffect(() => {
    void loadPreview().catch(() => undefined);
  }, [loadPreview]);

  const updateRevision = useCallback(
    async (manifest: PromptOverridesManifest) => {
      onRevisionChange(manifest.revision);
      await reload();
    },
    [onRevisionChange, reload],
  );

  const handleSave = useCallback(async () => {
    if (!selectedPrompt) return;
    const api = window.electronApi;
    if (!api?.promptOverridesSave) return;
    setBusy(true);
    setError(null);
    try {
      const manifest = await api.promptOverridesSave({
        scope,
        ...(scope === "document" ? { documentId } : {}),
        promptId: selectedPrompt.id,
        mode: selectedSegmentId ? "segments" : "full",
        segmentId: selectedSegmentId ?? undefined,
        content: overrideText,
        enabled: true,
      });
      await updateRevision(manifest);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [documentId, overrideText, scope, selectedPrompt, selectedSegmentId, updateRevision]);

  const handleToggle = useCallback(async () => {
    if (!selectedPrompt) return;
    const api = window.electronApi;
    if (!api?.promptOverridesSetEnabled) return;
    const manifest = await api.promptOverridesSetEnabled({
      scope,
      ...(scope === "document" ? { documentId } : {}),
      promptId: selectedPrompt.id,
      segmentId: selectedSegmentId ?? undefined,
      enabled: !overrideEnabled,
    });
    await updateRevision(manifest);
  }, [documentId, overrideEnabled, scope, selectedPrompt, selectedSegmentId, updateRevision]);

  const handleReset = useCallback(async () => {
    if (!selectedPrompt) return;
    const api = window.electronApi;
    if (!api?.promptOverridesDelete) return;
    const manifest = await api.promptOverridesDelete({
      scope,
      ...(scope === "document" ? { documentId } : {}),
      promptId: selectedPrompt.id,
      segmentId: selectedSegmentId ?? undefined,
    });
    setOverrideText("");
    await updateRevision(manifest);
  }, [documentId, scope, selectedPrompt, selectedSegmentId, updateRevision]);

  let previousKind: ConversationKind | null = null;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)] overflow-hidden">
      <aside className="min-h-0 overflow-y-auto border-r border-[var(--ui-sidebar-border)] bg-[var(--ui-sidebar-bg)] p-3">
        {sidebarHeader}

        <section className={sidebarHeader ? "mt-5 space-y-1" : "space-y-1"}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted-fg)]">System prompts</h3>
          {catalog.map((item) => {
            const showKind = !catalogKind && previousKind !== item.kind;
            previousKind = item.kind;
            return (
              <div key={item.id}>
                {showKind ? (
                  <p className="px-2 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ui-muted-fg)]">
                    {kindLabel(item.kind)}
                  </p>
                ) : null}
                <button
                  type="button"
                  className={`w-full rounded-md px-2 py-2 text-left text-xs ${
                    selectedPrompt?.id === item.id
                      ? "border border-[var(--ui-file-tree-active-border)] bg-[var(--ui-file-tree-active-bg)] text-[var(--ui-file-tree-fg)]"
                      : "text-[var(--ui-file-tree-muted-fg)] hover:bg-[var(--ui-file-tree-hover-bg)]"
                  }`}
                  onClick={() => {
                    setSelectedPromptId(item.id);
                    setSelectedSegmentId(null);
                  }}
                >
                  <span className="block font-medium">{item.label}</span>
                  <span className="block text-[11px] opacity-75">{item.id}</span>
                </button>
              </div>
            );
          })}
        </section>
      </aside>

      <main className="min-h-0 overflow-y-auto bg-[var(--ui-panel-bg)] p-4">
        {error ? (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}
        {note ? <div className="mb-3">{note}</div> : null}
        {selectedPrompt ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">{selectedPrompt.label}</h3>
              <p className="text-xs text-[var(--ui-muted-fg)]">{selectedPrompt.description}</p>
              <p className="mt-1 text-xs text-[var(--ui-muted-fg)]">
                {overrideEnabled ? "A usar override" : "A usar default"} · revision {revisionOf(snapshot)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setSelectedSegmentId(null)}>
                Full prompt
              </Button>
              {selectedPrompt.segments.map((segment) => (
                <Button
                  key={segment.id}
                  type="button"
                  size="sm"
                  variant={selectedSegmentId === segment.id ? "secondary" : "ghost"}
                  onClick={() => setSelectedSegmentId(segment.id)}
                >
                  {segment.label}
                </Button>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <section>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted-fg)]">
                  Default {selectedSegment ? `· ${selectedSegment.label}` : ""}
                </h4>
                <pre className="max-h-72 overflow-auto rounded-md border border-[var(--ui-panel-border)] bg-[var(--ui-shell-bg)] p-3 text-xs whitespace-pre-wrap text-[var(--ui-shell-fg)]">
                  {selectedSegmentId ? preview?.segments[selectedSegmentId] || "(empty)" : preview?.defaultPrompt || "(loading)"}
                </pre>
              </section>
              <section>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted-fg)]">Override</h4>
                <textarea
                  className="h-72 w-full resize-y rounded-md border border-[var(--ui-panel-border)] bg-[var(--ui-shell-bg)] p-3 font-mono text-xs text-[var(--ui-shell-fg)] outline-none placeholder:text-[var(--ui-muted-fg)] focus:ring-2 focus:ring-[var(--ui-border)] disabled:opacity-60"
                  value={overrideText}
                  onChange={(e) => setOverrideText(e.target.value)}
                  disabled={selectedSegmentIsDynamic}
                  placeholder={locale === "pt" ? "Escreva o override aqui..." : "Write the override here..."}
                />
                {selectedSegmentIsDynamic ? (
                  <p className="mt-1 text-xs text-[var(--ui-muted-fg)]">
                    {locale === "pt"
                      ? "Este segmento é gerado em runtime e fica apenas para pré-visualização."
                      : "This segment is generated at runtime and is preview-only."}
                  </p>
                ) : null}
              </section>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={handleSave} disabled={busy || selectedSegmentIsDynamic}>
                {locale === "pt" ? "Guardar override" : "Save override"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleToggle}
                disabled={!promptEntry || selectedSegmentIsDynamic}
              >
                {overrideEnabled ? "Inativar override" : "Ativar override"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleReset}
                disabled={!promptEntry || selectedSegmentIsDynamic}
              >
                {locale === "pt" ? "Repor default" : "Reset default"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={loadPreview}>
                {locale === "pt" ? "Pré-visualizar" : "Preview"}
              </Button>
            </div>

            <section>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted-fg)]">
                {locale === "pt" ? "Prompt resolvido" : "Resolved prompt"}
              </h4>
              <pre className="max-h-56 overflow-auto rounded-md border border-[var(--ui-panel-border)] bg-[var(--ui-shell-bg)] p-3 text-xs whitespace-pre-wrap text-[var(--ui-shell-fg)]">
                {preview?.resolvedPrompt || "(loading)"}
              </pre>
            </section>

            {footer}
          </div>
        ) : null}
      </main>
    </div>
  );
}
