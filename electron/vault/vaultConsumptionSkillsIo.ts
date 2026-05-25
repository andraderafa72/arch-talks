import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureArchitectureDataDir } from "../architectureFileIo.ts";

const VAULT_SKILLS_FILE = "vault-skills.json";
const BUILTIN_DIR_NAME = "vault-consumption-skills";

async function atomicWriteUtf8(targetPath: string, contents: string): Promise<void> {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const tmp = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, contents, "utf8");
  try {
    await fs.rename(tmp, targetPath);
  } catch {
    await fs.unlink(tmp).catch(() => undefined);
    throw new Error("Failed to write vault skills file");
  }
}

export type VaultSkillRecord = {
  id: string;
  name: string;
  description: string;
  content: string;
  builtin?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type VaultSkillsDocument = { items: VaultSkillRecord[] };

function isSafeSkillId(id: string): boolean {
  if (!id || id.length > 200) return false;
  if (id.includes("..") || id.includes("/") || id.includes("\\")) return false;
  return /^[a-fA-F0-9-]{36}$/.test(id) || /^builtin:[a-z0-9-]+$/.test(id);
}

function builtinDirCandidates(): string[] {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const roots = [here, path.join(here, ".."), app?.getAppPath?.() ?? process.cwd(), process.cwd()].filter(
    Boolean,
  ) as string[];

  const out: string[] = [];
  for (const root of roots) {
    out.push(path.join(root, BUILTIN_DIR_NAME));
    out.push(path.join(root, "electron", BUILTIN_DIR_NAME));
  }
  return [...new Set(out)];
}

async function resolveBuiltinSkillsDir(): Promise<string | null> {
  for (const dir of builtinDirCandidates()) {
    try {
      const stat = await fs.stat(dir);
      if (stat.isDirectory()) return dir;
    } catch {
      /* try next */
    }
  }
  return null;
}

function parseBuiltinSkillMarkdown(fileName: string, raw: string): VaultSkillRecord {
  const slug = fileName.replace(/\.md$/i, "");
  const id = `builtin:${slug}`;
  const lines = raw.trim().split("\n");
  let name = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  let description = "";
  let bodyStart = 0;

  if (lines[0]?.startsWith("# ")) {
    name = lines[0].slice(2).trim();
    bodyStart = 1;
  }

  while (bodyStart < lines.length && lines[bodyStart]?.trim() === "") {
    bodyStart += 1;
  }

  if (bodyStart < lines.length) {
    const candidate = lines[bodyStart]?.trim() ?? "";
    if (candidate && !candidate.startsWith("#")) {
      description = candidate;
    }
  }

  return {
    id,
    name,
    description,
    content: raw.trim(),
    builtin: true,
  };
}

async function loadBuiltinVaultSkills(): Promise<VaultSkillRecord[]> {
  const dir = await resolveBuiltinSkillsDir();
  if (!dir) return [];

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const skills: VaultSkillRecord[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const content = await fs.readFile(path.join(dir, entry.name), "utf8");
    skills.push(parseBuiltinSkillMarkdown(entry.name, content));
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

async function readUserVaultSkillsDoc(): Promise<VaultSkillsDocument> {
  const dataRoot = await ensureArchitectureDataDir();
  const filePath = path.join(dataRoot, VAULT_SKILLS_FILE);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as VaultSkillsDocument;
    if (!Array.isArray(parsed?.items)) return { items: [] };
    return {
      items: parsed.items.filter(
        (item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          typeof item.content === "string" &&
          !item.builtin,
      ),
    };
  } catch {
    return { items: [] };
  }
}

async function writeUserVaultSkillsDoc(doc: VaultSkillsDocument): Promise<void> {
  const dataRoot = await ensureArchitectureDataDir();
  const filePath = path.join(dataRoot, VAULT_SKILLS_FILE);
  await atomicWriteUtf8(filePath, `${JSON.stringify(doc, null, 2)}\n`);
}

export async function listVaultConsumptionSkills(): Promise<VaultSkillRecord[]> {
  const [builtin, userDoc] = await Promise.all([loadBuiltinVaultSkills(), readUserVaultSkillsDoc()]);
  const userSkills = userDoc.items.map((item) => ({
    ...item,
    description: item.description ?? "",
    builtin: false as const,
  }));
  return [...builtin, ...userSkills.sort((a, b) => a.name.localeCompare(b.name))];
}

export async function saveUserVaultSkill(
  input: Pick<VaultSkillRecord, "id" | "name" | "description" | "content">,
): Promise<VaultSkillRecord> {
  if (!isSafeSkillId(input.id) || input.id.startsWith("builtin:")) {
    throw new Error("Invalid skill id");
  }
  const name = input.name.trim();
  const content = input.content.trim();
  if (!name) throw new Error("Skill name is required");
  if (!content) throw new Error("Skill content is required");

  const doc = await readUserVaultSkillsDoc();
  const now = new Date().toISOString();
  const existing = doc.items.find((item) => item.id === input.id);
  const next: VaultSkillRecord = {
    id: input.id,
    name,
    description: input.description.trim(),
    content,
    builtin: false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const items = existing
    ? doc.items.map((item) => (item.id === input.id ? next : item))
    : [...doc.items, next];

  await writeUserVaultSkillsDoc({ items });
  return next;
}

export async function deleteUserVaultSkill(id: string): Promise<void> {
  if (!isSafeSkillId(id) || id.startsWith("builtin:")) {
    throw new Error("Cannot delete built-in skill");
  }
  const doc = await readUserVaultSkillsDoc();
  await writeUserVaultSkillsDoc({ items: doc.items.filter((item) => item.id !== id) });
}
