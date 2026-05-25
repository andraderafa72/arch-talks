export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function stoppedAssistantContent(partial: string, locale: "en" | "pt"): string | null {
  const text = partial.trim();
  if (!text) return null;
  const suffix = locale === "pt" ? "\n\n*(interrompido)*" : "\n\n*(stopped)*";
  return `${text}${suffix}`;
}

export function stoppedSystemContent(locale: "en" | "pt"): string {
  return locale === "pt" ? "Geração interrompida." : "Generation stopped.";
}
