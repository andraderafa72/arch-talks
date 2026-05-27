import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  integrationCatalogLabels,
  listIntegrationCatalogMeta,
} from "@/config/integrationsCatalog";
import { useIntegrationsPreferences } from "@/hooks/useIntegrationsPreferences";
import type { IntegrationId } from "@/types/userPreferences";
import { integrationsStrings } from "@/lib/uiCopy";
import type { UiLocale } from "@/types";

type IntegrationsPanelProps = {
  locale: UiLocale;
};

function canExecuteIntegration(id: IntegrationId): boolean {
  return id !== "plentymarkets";
}

export function IntegrationsPanel({ locale }: IntegrationsPanelProps) {
  const t = integrationsStrings(locale);
  const { integrations, loading, applyHealthResults } = useIntegrationsPreferences();
  const [busyId, setBusyId] = useState<IntegrationId | "all" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<IntegrationId | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const api = typeof window !== "undefined" ? window.electronApi : undefined;
  const isElectron = Boolean(api?.integrationsCheck && api?.integrationsRunStart);

  const catalog = useMemo(() => listIntegrationCatalogMeta(), []);

  const runCheck = useCallback(
    async (id?: IntegrationId | "all") => {
      if (!api?.integrationsCheck) return;
      setBusyId(id ?? "all");
      setActionError(null);
      try {
        const res = await api.integrationsCheck(id ?? "all");
        if (!res.ok) {
          setActionError(res.error);
          return;
        }
        await applyHealthResults(res.results);
      } finally {
        setBusyId(null);
      }
    },
    [api, applyHealthResults],
  );

  useEffect(() => {
    if (!isElectron || loading) return;
    void runCheck("all");
  }, [isElectron, loading, runCheck]);

  const handleExecute = async (id: IntegrationId) => {
    if (!api?.integrationsRunStart) return;
    if (!canExecuteIntegration(id)) return;
    setBusyId(id);
    setActionError(null);
    setToast(t.executeStarted);
    try {
      const res = await api.integrationsRunStart(id);
      if (!res.ok) {
        setActionError(res.error ?? t.executeFailed);
        setToast(null);
        return;
      }
      window.setTimeout(() => {
        void runCheck(id);
      }, 2000);
    } finally {
      setBusyId(null);
    }
  };

  const handleCopy = async (id: IntegrationId) => {
    const text = integrationCatalogLabels(id, locale).startCommandPlaceholder;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setActionError("Clipboard unavailable");
    }
  };

  const stillNeeded = catalog.filter((entry) => !integrations[entry.id]?.configured);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-auto bg-[var(--ui-shell-bg)] p-6 text-[var(--ui-shell-fg)]">
      <header className="mb-6 max-w-3xl">
        <h1 className="text-xl font-semibold">{t.title}</h1>
        <p className="mt-1 text-sm text-[var(--ui-muted-fg)]">{t.subtitle}</p>
      </header>

      {toast ? (
        <p className="mb-4 max-w-3xl rounded-md border border-[var(--ui-panel-border)] bg-[var(--ui-panel-bg)] px-3 py-2 text-sm">
          {toast}
        </p>
      ) : null}

      {actionError ? (
        <p className="mb-4 max-w-3xl text-sm text-red-600 dark:text-red-400">{actionError}</p>
      ) : null}

      {stillNeeded.length > 0 ? (
        <section className="mb-6 max-w-3xl">
          <h2 className="text-sm font-semibold">{t.stillNeeded}</h2>
          <ul className="mt-2 list-inside list-disc text-sm text-[var(--ui-muted-fg)]">
            {stillNeeded.map((entry) => (
              <li key={entry.id}>{integrationCatalogLabels(entry.id, locale).title}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex max-w-3xl flex-col gap-4">
        {catalog.map((entry) => {
          const labels = integrationCatalogLabels(entry.id, locale);
          const state = integrations[entry.id];
          const configured = state?.configured === true;
          const executeEnabled = isElectron && canExecuteIntegration(entry.id);
          const command = labels.startCommandPlaceholder;

          return (
            <article
              key={entry.id}
              className="rounded-lg border border-[var(--ui-panel-border)] bg-[var(--ui-panel-bg)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium">{labels.title}</h3>
                  <p className="mt-1 text-sm text-[var(--ui-muted-fg)]">{labels.description}</p>
                </div>
                <Badge
                  className={
                    configured
                      ? "border-emerald-600/40 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300"
                      : entry.id === "plentymarkets"
                        ? "opacity-80"
                        : undefined
                  }
                >
                  {entry.id === "plentymarkets" && !configured
                    ? t.comingSoon
                    : configured
                      ? t.configured
                      : t.notConfigured}
                </Badge>
              </div>

              <label className="mt-4 block text-xs font-medium text-[var(--ui-muted-fg)]">{t.startCommand}</label>
              <pre className="mt-1 overflow-x-auto rounded-md border border-[var(--ui-panel-border)] bg-[var(--ui-shell-bg)] p-2 font-mono text-xs">
                {command}
              </pre>

              {state?.lastError ? (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {t.lastError}: {state.lastError}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={!executeEnabled || busyId !== null}
                  onClick={() => void handleExecute(entry.id)}
                >
                  {busyId === entry.id ? t.checking : t.execute}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!isElectron || busyId !== null}
                  onClick={() => void runCheck(entry.id)}
                >
                  {busyId === entry.id || busyId === "all" ? t.checking : t.checkStatus}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => void handleCopy(entry.id)}>
                  {copiedId === entry.id ? t.copied : t.copyCommand}
                </Button>
                {entry.docsUrl ? (
                  <a
                    href={entry.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center px-3 text-sm text-[var(--ui-muted-fg)] underline-offset-2 hover:underline"
                  >
                    {t.openDocs}
                  </a>
                ) : null}
              </div>

              {!isElectron ? (
                <p className="mt-2 text-xs text-[var(--ui-muted-fg)]">{t.electronRequired}</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
