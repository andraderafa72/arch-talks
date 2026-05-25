import type { VaultConfirmedChange } from "./vaultTypes.ts";

export function normalizeVaultPath(rel: string): string {
  const s = rel.trim().replace(/\\/g, "/");
  const parts = s.split("/").filter((p) => p && p !== ".");
  if (parts.some((p) => p === "..")) throw new Error(`Invalid vault path: ${rel}`);
  return parts.join("/");
}

export function applyConfirmedVaultChanges(
  existing: Record<string, string>,
  confirmed: ReadonlyArray<VaultConfirmedChange>,
): Record<string, string> {
  const next = { ...existing };
  for (const { path, content } of confirmed) {
    next[normalizeVaultPath(path)] = content;
  }
  return next;
}
