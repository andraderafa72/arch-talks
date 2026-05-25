const VAULT_NOTE_PATH =
  /(?:\*\*([^*]+\.(?:md|markdown|mdx))\*\*|(?<![\w./])([\w./][\w./\s-]*\.(?:md|markdown|mdx)))/gi;

export function extractVaultNotePaths(text: string, knownPaths?: Set<string>): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(VAULT_NOTE_PATH)) {
    const candidate = (match[1] ?? match[2] ?? "").trim().replace(/^\.\//, "");
    if (!candidate || candidate.includes("..")) continue;
    if (knownPaths && !knownPaths.has(candidate)) {
      const normalized = [...knownPaths].find(
        (path) => path.toLowerCase() === candidate.toLowerCase() || path.endsWith(`/${candidate}`),
      );
      if (normalized) {
        found.add(normalized);
        continue;
      }
    }
    found.add(candidate);
  }
  return [...found];
}
