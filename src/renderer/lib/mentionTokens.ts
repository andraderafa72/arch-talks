export type MentionSuggestion = {
  token: string;
  label: string;
  group: string;
  isDirectory: boolean;
};

/** Tokens inserted in chat: @ws:path or @ref:group:relative/path */
export const MENTION_TOKEN_REGEX = /@(?:ws|ref):[^\s]+/g;

export function formatWorkspaceMentionToken(relativePath: string): string {
  return `@ws:${relativePath}`;
}

export function formatReferenceMentionToken(group: string, relativePath: string): string {
  return `@ref:${group}:${relativePath}`;
}

export function extractMentionTokens(text: string): string[] {
  return [...text.matchAll(MENTION_TOKEN_REGEX)].map((m) => m[0]);
}

export function buildWorkspaceMentionSuggestions(
  workspacePaths: string[],
  query: string,
): MentionSuggestion[] {
  const q = query.trim().toLowerCase();
  const treePaths = workspacePaths.filter((p) => !p.endsWith(".keep"));
  const folders = new Set<string>();
  for (const p of treePaths) {
    const parts = p.split("/");
    for (let i = 1; i < parts.length; i += 1) {
      folders.add(parts.slice(0, i).join("/"));
    }
  }
  const items: MentionSuggestion[] = [];
  for (const folder of [...folders].sort()) {
    items.push({
      token: formatWorkspaceMentionToken(folder),
      label: folder,
      group: "workspace",
      isDirectory: true,
    });
  }
  for (const file of treePaths.sort()) {
    items.push({
      token: formatWorkspaceMentionToken(file),
      label: file,
      group: "workspace",
      isDirectory: false,
    });
  }
  if (!q) return items.slice(0, 80);
  return items.filter((i) => i.label.toLowerCase().includes(q)).slice(0, 80);
}
