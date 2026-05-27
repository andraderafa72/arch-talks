import fs from "node:fs/promises";
import path from "node:path";

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "dist-electron", "build", ".obsidian"]);
const MAX_ENTRIES = 500;

export type ReferenceEntry = {
  token: string;
  label: string;
  group: string;
  isDirectory: boolean;
};

async function walkEntries(root: string, base = root, entries: ReferenceEntry[], group: string): Promise<void> {
  if (entries.length >= MAX_ENTRIES) return;
  const dirEntries = await fs.readdir(base, { withFileTypes: true }).catch(() => []);
  for (const ent of dirEntries) {
    if (entries.length >= MAX_ENTRIES) return;
    if (ent.name.startsWith(".")) continue;
    const full = path.join(base, ent.name);
    const rel = path.relative(root, full).replace(/\\/g, "/");
    const token = `ref:${group}:${rel}`;
    const label = rel || ent.name;
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      entries.push({ token, label, group, isDirectory: true });
      await walkEntries(root, full, entries, group);
    } else if (ent.isFile()) {
      entries.push({ token, label, group, isDirectory: false });
    }
  }
}

export async function listReferenceEntries(
  referencePaths: string[],
  query: string,
): Promise<ReferenceEntry[]> {
  const q = query.trim().toLowerCase();
  const all: ReferenceEntry[] = [];

  for (let i = 0; i < referencePaths.length; i += 1) {
    const folderPath = referencePaths[i]?.trim();
    if (!folderPath) continue;
    const resolved = path.resolve(folderPath);
    const stat = await fs.stat(resolved).catch(() => null);
    if (!stat?.isDirectory()) continue;
    const group = path.basename(resolved) || `ref-${i}`;
    all.push({
      token: `ref:${group}:`,
      label: group,
      group,
      isDirectory: true,
    });
    await walkEntries(resolved, resolved, all, group);
  }

  const filtered = q
    ? all.filter((e) => e.label.toLowerCase().includes(q) || e.group.toLowerCase().includes(q))
    : all;
  return filtered.slice(0, 80);
}
