import type { LocalAiProviderOption, LocalAiSelection } from "@/types/electron-api";

/** Matches ChatAiControls default: persisted selection, else first listed provider. */
export function resolveEffectiveAiSelection(
  selection: LocalAiSelection | undefined,
  providers: LocalAiProviderOption[],
): LocalAiSelection | undefined {
  if (selection?.provider) {
    const exists = providers.some((p) => p.provider === selection.provider);
    if (exists || providers.length === 0) return selection;
  }
  const first = providers[0];
  return first ? { provider: first.provider } : undefined;
}

export function isLocalAgentSelection(
  selection: LocalAiSelection | undefined,
  providers: LocalAiProviderOption[],
  models: { id: string; provider: string; category?: string }[] = [],
): boolean {
  const effective = resolveEffectiveAiSelection(selection, providers);
  if (!effective?.provider) return false;
  if (providers.find((p) => p.provider === effective.provider)?.category === "local-agent") {
    return true;
  }
  if (effective.modelId) {
    return models.find((m) => m.id === effective.modelId)?.category === "local-agent";
  }
  return false;
}

export function localAgentFolderScanHint(locale: "en" | "pt"): string {
  return locale === "pt"
    ? "Selecione um agente local (Cursor CLI, Claude CLI, Codex CLI, Gemini CLI, …) para analisar um projeto existente no disco."
    : "Select a local agent (Cursor CLI, Claude CLI, Codex CLI, Gemini CLI, …) to analyze an existing project on disk.";
}
