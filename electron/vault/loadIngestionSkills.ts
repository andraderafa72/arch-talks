import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { VaultCategory } from "./archConfig.ts";

const SKILLS_DIR_NAME = "vault-ingestion-skills";
const SEMANTIC_SUBDIR = "semantic";
const SHARED_SUBDIR = "shared";

function skillsDirCandidates(): string[] {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const roots = [here, path.join(here, ".."), app?.getAppPath?.() ?? process.cwd(), process.cwd()].filter(
    Boolean,
  ) as string[];

  const out: string[] = [];
  for (const root of roots) {
    out.push(path.join(root, SKILLS_DIR_NAME));
    out.push(path.join(root, "electron", SKILLS_DIR_NAME));
  }
  return [...new Set(out)];
}

export async function resolveVaultIngestionSkillsDir(): Promise<string> {
  for (const dir of skillsDirCandidates()) {
    try {
      const stat = await fs.stat(dir);
      if (stat.isDirectory()) return dir;
    } catch {
      /* try next */
    }
  }
  throw new Error(`Vault ingestion skills directory not found (${SKILLS_DIR_NAME})`);
}

async function loadMarkdownSkillsFromDir(dir: string, labelPrefix: string): Promise<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const mdFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  const parts: string[] = [];
  for (const name of mdFiles) {
    const content = await fs.readFile(path.join(dir, name), "utf8");
    parts.push(`<!-- skill: ${labelPrefix}${name} -->\n${content.trim()}`);
  }
  return parts.join("\n\n---\n\n");
}

/** Phase A — semantic compiler skills (extraction, canonicalization, IR contract). */
export async function loadSemanticIngestionSkills(): Promise<string> {
  const root = await resolveVaultIngestionSkillsDir();
  const semanticDir = path.join(root, SEMANTIC_SUBDIR);
  try {
    const stat = await fs.stat(semanticDir);
    if (!stat.isDirectory()) {
      throw new Error("semantic skills subdirectory missing");
    }
  } catch {
    throw new Error(`Vault semantic ingestion skills not found (${SEMANTIC_SUBDIR}/)`);
  }
  return loadMarkdownSkillsFromDir(semanticDir, "semantic/");
}

/** Phase B — shared planning skills + category-specific placement rules. */
export async function loadVaultPlanningSkills(category: VaultCategory): Promise<string> {
  const root = await resolveVaultIngestionSkillsDir();
  const sharedDir = path.join(root, SHARED_SUBDIR);
  const categoryDir = path.join(root, category);

  const [shared, categorySkills] = await Promise.all([
    loadMarkdownSkillsFromDir(sharedDir, "shared/"),
    loadMarkdownSkillsFromDir(categoryDir, `${category}/`),
  ]);

  return [shared, categorySkills].filter(Boolean).join("\n\n---\n\n");
}
