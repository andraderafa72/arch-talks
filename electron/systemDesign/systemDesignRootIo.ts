import fs from "node:fs/promises";
import path from "node:path";

function normalizeRelativePath(rel: string): string {
  const s = rel.trim().replace(/\\/g, "/");
  const parts = s.split("/").filter((p) => p && p !== ".");
  if (parts.some((p) => p === "..")) throw new Error("Invalid path");
  return parts.join("/");
}

function resolveUnder(rootPath: string, relativePosix: string): string {
  const normalized = normalizeRelativePath(relativePosix);
  if (!normalized) throw new Error("Invalid path");
  const full = path.join(rootPath, ...normalized.split("/"));
  const resolved = path.resolve(full);
  const rootResolved = path.resolve(rootPath);
  if (!resolved.startsWith(rootResolved + path.sep) && resolved !== rootResolved) {
    throw new Error("Path escape");
  }
  return resolved;
}

export async function writeSystemDesignRootFiles(
  rootPath: string,
  files: Record<string, string>,
): Promise<void> {
  await fs.mkdir(rootPath, { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const safeRel = normalizeRelativePath(rel);
    const target = resolveUnder(rootPath, safeRel);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, "utf8");
  }
}
