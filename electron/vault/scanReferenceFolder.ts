import fs from "node:fs/promises";
import path from "node:path";

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "dist-electron", "build", ".obsidian"]);
const TEXT_EXTENSIONS = new Set([
  ".md",
  ".markdown",
  ".txt",
  ".tex",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".cs",
  ".yaml",
  ".yml",
  ".toml",
  ".html",
  ".css",
  ".scss",
]);

const MAX_TOTAL_CHARS = 120_000;
const MAX_FILE_CHARS = 12_000;

export type ReferenceScanResult = {
  excerpt: string;
  fileCount: number;
  truncated: boolean;
};

async function walkFiles(root: string, base = root): Promise<string[]> {
  const entries = await fs.readdir(base, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const ent of entries) {
    if (ent.name.startsWith(".")) continue;
    const full = path.join(base, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      files.push(...(await walkFiles(root, full)));
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (TEXT_EXTENSIONS.has(ext)) files.push(full);
    }
  }
  return files;
}

export async function scanReferenceFolder(folderPath: string): Promise<ReferenceScanResult> {
  const resolved = path.resolve(folderPath);
  const stat = await fs.stat(resolved);
  if (!stat.isDirectory()) throw new Error("Reference path is not a directory");

  const files = (await walkFiles(resolved)).sort();
  const parts: string[] = [];
  let total = 0;
  let truncated = false;

  for (const file of files) {
    if (total >= MAX_TOTAL_CHARS) {
      truncated = true;
      break;
    }
    const rel = path.relative(resolved, file).replace(/\\/g, "/");
    let content = await fs.readFile(file, "utf8").catch(() => "");
    if (content.length > MAX_FILE_CHARS) {
      content = `${content.slice(0, MAX_FILE_CHARS)}\n…(truncated)`;
      truncated = true;
    }
    const block = `### ${rel}\n\`\`\`\n${content}\n\`\`\``;
    if (total + block.length > MAX_TOTAL_CHARS) {
      truncated = true;
      break;
    }
    parts.push(block);
    total += block.length;
  }

  return {
    excerpt: parts.length > 0 ? parts.join("\n\n") : "(no readable text files found)",
    fileCount: files.length,
    truncated,
  };
}
