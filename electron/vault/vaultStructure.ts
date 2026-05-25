import type { VaultIngestionPlan } from "./vaultTypes.ts";
import { normalizeVaultPath } from "./applyVaultIngestionPlan.ts";

const OVERVIEW_BASENAMES = new Set(["overview", "overview.md"]);

function isOverviewPath(filePath: string): boolean {
  const base = filePath.split("/").pop()?.toLowerCase() ?? "";
  if (OVERVIEW_BASENAMES.has(base)) return true;
  if (base.endsWith("-overview.md") || base === "overview.md") return true;
  if (base.endsWith("-overview")) return true;
  return false;
}

export { isOverviewPath };

/** Last path segment of a folder key, e.g. `billing/rules` → `rules`. */
export function folderOverviewSegment(folder: string): string {
  const key = folder === "(root)" ? "" : folder.trim();
  if (!key) return "vault";
  return key.split("/").filter(Boolean).pop() ?? key;
}

/** Preferred overview filename for a folder (no directory prefix). */
export function folderOverviewBasename(folder: string): string {
  return `${folderOverviewSegment(folder)}-overview.md`;
}

/** Preferred relative path for a folder's overview note. */
export function preferredOverviewPathForFolder(folder: string): string {
  if (!folder || folder === "(root)") return "vault-overview.md";
  return `${folder}/${folderOverviewBasename(folder)}`;
}

function folderKey(filePath: string): string {
  const norm = normalizeVaultPath(filePath);
  const idx = norm.lastIndexOf("/");
  return idx >= 0 ? norm.slice(0, idx) : "";
}

export type FolderStructureEntry = {
  folder: string;
  noteCount: number;
  overviewPath: string | null;
  files: string[];
};

export type VaultStructureReport = {
  folders: FolderStructureEntry[];
  totalFiles: number;
};

export function analyzeVaultFiles(files: Record<string, string>): VaultStructureReport {
  const byFolder = new Map<string, { notes: string[]; overview: string | null }>();

  for (const filePath of Object.keys(files)) {
    const norm = normalizeVaultPath(filePath);
    const key = folderKey(norm);
    let entry = byFolder.get(key);
    if (!entry) {
      entry = { notes: [], overview: null };
      byFolder.set(key, entry);
    }
    if (isOverviewPath(norm)) {
      entry.overview = norm;
    } else if (norm.endsWith(".md") || norm.endsWith(".markdown")) {
      entry.notes.push(norm);
    }
  }

  const folders: FolderStructureEntry[] = [...byFolder.entries()]
    .map(([folder, { notes, overview }]) => ({
      folder: folder || "(root)",
      noteCount: notes.length,
      overviewPath: overview,
      files: [...notes, ...(overview ? [overview] : [])].sort(),
    }))
    .sort((a, b) => a.folder.localeCompare(b.folder));

  return { folders, totalFiles: Object.keys(files).length };
}

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

const MAX_NOTES_PER_FOLDER = 20;

export function validateVaultIngestionPlan(
  plan: VaultIngestionPlan,
  existing: Record<string, string>,
): ValidationResult {
  const errors: string[] = [];
  const simulated = { ...existing };

  for (const { path, content } of plan.creates) {
    simulated[normalizeVaultPath(path)] = content;
  }
  for (const { path, content } of plan.updates) {
    simulated[normalizeVaultPath(path)] = content;
  }

  const report = analyzeVaultFiles(simulated);

  for (const entry of report.folders) {
    if (entry.noteCount > MAX_NOTES_PER_FOLDER) {
      errors.push(
        `Folder "${entry.folder}" would have ${entry.noteCount} notes (max ${MAX_NOTES_PER_FOLDER}, overview excluded).`,
      );
    }
    if (entry.noteCount > 0 && !entry.overviewPath) {
      errors.push(`Folder "${entry.folder}" has notes but no overview file.`);
    }
  }

  for (const { path } of [...plan.creates, ...plan.updates]) {
    if (!path.trim()) errors.push("Plan entry has empty path.");
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true };
}

export function formatVaultStructureReport(report: VaultStructureReport): string {
  const lines = [
    "Read this section before choosing folders, paths, vault_hint, creates vs updates, or overview updates.",
    `Total vault files: ${report.totalFiles}`,
    "",
  ];
  for (const f of report.folders) {
    lines.push(
      `### ${f.folder}`,
      `- Notes in folder: ${f.noteCount} (max 20 per folder; overview excluded from count)`,
      `- Overview file: ${
        f.overviewPath ??
        `MISSING — create or update ${preferredOverviewPathForFolder(f.folder)} when adding notes here`
      }`,
    );
    if (f.files.length > 0) {
      lines.push("- Existing paths:");
      for (const filePath of f.files) {
        lines.push(`  - ${filePath}`);
      }
    } else {
      lines.push("- Existing paths: (none yet)");
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
