import fs from "node:fs/promises";
import path from "node:path";
import { scanReferenceFolder } from "../shared/scanTextFolder.ts";

export type MentionContext = { label: string; excerpt: string };

const MAX_FILE_CHARS = 12_000;

async function readWorkspaceFileContent(files: Record<string, string>, relPath: string): Promise<string | null> {
  if (Object.hasOwn(files, relPath)) {
    return files[relPath] ?? "";
  }
  const prefix = `${relPath}/`;
  const nested = Object.entries(files).filter(([key]) => key.startsWith(prefix));
  if (nested.length === 0) return null;
  const parts = nested
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, content]) => `### ${key}\n\`\`\`\n${content}\n\`\`\``);
  return parts.join("\n\n");
}

function resolveReferenceRoot(referencePaths: string[], group: string): string | null {
  for (const refPath of referencePaths) {
    const trimmed = refPath.trim();
    if (!trimmed) continue;
    const base = path.basename(path.resolve(trimmed));
    if (base === group) return path.resolve(trimmed);
  }
  return null;
}

export async function resolveMentionContexts(options: {
  tokens: string[];
  files: Record<string, string>;
  referencePaths: string[];
}): Promise<MentionContext[]> {
  const contexts: MentionContext[] = [];
  const seen = new Set<string>();

  for (const token of options.tokens) {
    if (seen.has(token)) continue;
    seen.add(token);

    if (token.startsWith("@ws:")) {
      const rel = token.slice(4);
      const content = await readWorkspaceFileContent(options.files, rel);
      if (content === null) continue;
      const excerpt =
        content.length > MAX_FILE_CHARS ? `${content.slice(0, MAX_FILE_CHARS)}\n…(truncated)` : content;
      contexts.push({ label: rel, excerpt: `### ${rel}\n\`\`\`\n${excerpt}\n\`\`\`` });
      continue;
    }

    if (token.startsWith("@ref:")) {
      const body = token.slice(5);
      const colon = body.indexOf(":");
      if (colon <= 0) continue;
      const group = body.slice(0, colon);
      const rel = body.slice(colon + 1);
      const root = resolveReferenceRoot(options.referencePaths, group);
      if (!root) continue;

      if (!rel) {
        const scan = await scanReferenceFolder(root);
        contexts.push({ label: group, excerpt: scan.excerpt });
        continue;
      }

      const full = path.join(root, rel);
      const stat = await fs.stat(full).catch(() => null);
      if (!stat) continue;

      if (stat.isDirectory()) {
        const scan = await scanReferenceFolder(full);
        contexts.push({ label: `${group}/${rel}`, excerpt: scan.excerpt });
      } else {
        let content = await fs.readFile(full, "utf8").catch(() => "");
        if (content.length > MAX_FILE_CHARS) {
          content = `${content.slice(0, MAX_FILE_CHARS)}\n…(truncated)`;
        }
        contexts.push({
          label: `${group}/${rel}`,
          excerpt: `### ${rel}\n\`\`\`\n${content}\n\`\`\``,
        });
      }
    }
  }

  return contexts;
}
