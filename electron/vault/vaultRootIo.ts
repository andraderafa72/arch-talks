import fs from "node:fs/promises";
import path from "node:path";
import { ARCH_CONFIG_FILENAME, type VaultCategory } from "./archConfig.ts";
import { buildVaultScaffold } from "./vaultScaffold.ts";

export { buildVaultScaffold };
export type { VaultCategory };

const VAULT_NOTE_EXTENSIONS = new Set([".md", ".markdown", ".mdx", ".txt"]);

export function isMarkdownVaultPath(rel: string): boolean {
  const lower = rel.toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".markdown") || lower.endsWith(".mdx");
}

function isVaultNotePath(rel: string): boolean {
  if (rel === ARCH_CONFIG_FILENAME) return false;
  const lower = rel.toLowerCase();
  return [...VAULT_NOTE_EXTENSIONS].some((ext) => lower.endsWith(ext));
}

function shouldListInVaultTree(rel: string): boolean {
  return rel !== ARCH_CONFIG_FILENAME && !rel.includes("..");
}

async function walkVaultTree(
  filesRoot: string,
  relPrefix: string,
  onFile: (rel: string) => void,
): Promise<void> {
  let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
  try {
    entries = await fs.readdir(path.join(filesRoot, relPrefix), { withFileTypes: true });
  } catch {
    return;
  }
  const base = relPrefix ? `${relPrefix}/` : "";
  for (const ent of entries) {
    const rel = base + ent.name;
    if (!shouldListInVaultTree(rel)) continue;
    if (ent.isDirectory()) {
      await walkVaultTree(filesRoot, rel, onFile);
    } else if (ent.isFile()) {
      onFile(rel);
    }
  }
}

export async function listVaultRootPaths(
  vaultRootPath: string,
  filter: "markdown" | "all",
): Promise<string[]> {
  const paths: string[] = [];
  await walkVaultTree(vaultRootPath, "", (rel) => {
    if (filter === "markdown" && !isMarkdownVaultPath(rel)) return;
    paths.push(rel);
  });
  return paths.sort();
}

async function loadVaultNoteFiles(filesRoot: string, relPrefix: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const notePaths: string[] = [];
  await walkVaultTree(filesRoot, relPrefix, (rel) => {
    if (isVaultNotePath(rel)) notePaths.push(rel);
  });
  for (const rel of notePaths) {
    const abs = path.join(filesRoot, ...rel.split("/"));
    out[rel] = await fs.readFile(abs, "utf8");
  }
  return out;
}

export async function readVaultRootFiles(vaultRootPath: string): Promise<Record<string, string>> {
  await fs.mkdir(vaultRootPath, { recursive: true });
  return loadVaultNoteFiles(vaultRootPath, "");
}

export async function readVaultFileAtPath(vaultRootPath: string, rel: string): Promise<string> {
  const normalized = rel.trim().replace(/\\/g, "/");
  const parts = normalized.split("/").filter((p) => p && p !== ".");
  if (parts.some((p) => p === "..")) throw new Error(`Invalid vault path: ${rel}`);
  const safeRel = parts.join("/");
  if (!safeRel || !shouldListInVaultTree(safeRel)) {
    throw new Error(`Cannot read vault path: ${rel}`);
  }
  const abs = path.join(vaultRootPath, ...safeRel.split("/"));
  const stat = await fs.stat(abs);
  if (!stat.isFile()) throw new Error(`Not a file: ${rel}`);
  return fs.readFile(abs, "utf8");
}

async function pruneVaultNotesNotIn(vaultRootPath: string, relativePaths: Set<string>): Promise<void> {
  const toDelete: string[] = [];
  await walkVaultTree(vaultRootPath, "", (rel) => {
    if (isVaultNotePath(rel) && !relativePaths.has(rel)) {
      toDelete.push(rel);
    }
  });
  for (const rel of toDelete) {
    await fs.unlink(path.join(vaultRootPath, ...rel.split("/"))).catch(() => undefined);
  }
}

export async function writeVaultRootFiles(
  vaultRootPath: string,
  files: Record<string, string>,
): Promise<void> {
  await fs.mkdir(vaultRootPath, { recursive: true });
  const protectedPaths = new Set([ARCH_CONFIG_FILENAME]);
  const desired = new Set(
    Object.keys(files)
      .map((rel) => rel.trim().replace(/\\/g, "/"))
      .filter((rel) => rel && isVaultNotePath(rel)),
  );
  await pruneVaultNotesNotIn(vaultRootPath, desired);

  for (const [rel, content] of Object.entries(files)) {
    if (protectedPaths.has(rel)) continue;
    const normalized = rel.trim().replace(/\\/g, "/");
    const parts = normalized.split("/").filter((p) => p && p !== ".");
    if (parts.some((p) => p === "..")) throw new Error(`Invalid vault path: ${rel}`);
    const safeRel = parts.join("/");
    if (!safeRel || !isVaultNotePath(safeRel)) continue;

    const target = path.join(vaultRootPath, ...safeRel.split("/"));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, "utf8");
  }
}

/** @deprecated Use buildVaultScaffold(category) */
export const vaultDefaultScaffold: Record<string, string> = buildVaultScaffold("business");

export function pickVaultActiveFile(files: Record<string, string>, diskPaths: string[]): string {
  if (files["vault-overview.md"]) return "vault-overview.md";
  const markdownFromFiles = Object.keys(files).filter(isMarkdownVaultPath).sort();
  if (markdownFromFiles[0]) return markdownFromFiles[0];
  const markdownFromDisk = diskPaths.filter(isMarkdownVaultPath).sort();
  if (markdownFromDisk[0]) return markdownFromDisk[0];
  const anyFile = Object.keys(files).sort()[0] ?? diskPaths.sort()[0];
  return anyFile ?? "";
}
