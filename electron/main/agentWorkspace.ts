import { app } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type LocalAiWorkspaceOptions = {
  cwd?: string;
  /** When true, local agents trust `cwd` and optional `additionalDirs` for this session. */
  trustWorkspace?: boolean;
  /** Extra directories passed to CLI `--add-dir` (primary scan root is always `cwd`). */
  additionalDirs?: string[];
};

const SANDBOX_DIR_NAME = "rag-talks-agent-sandbox";

/** Paths that must never be used as implicit or explicit agent codebase scan roots. */
export function getBlockedAgentScanRoots(): string[] {
  const roots = new Set<string>();
  try {
    roots.add(path.resolve(app.getAppPath()));
  } catch {
    /* ignore */
  }
  roots.add(path.resolve(process.cwd()));
  return [...roots];
}

export function isBlockedAgentScanPath(folderPath: string): boolean {
  const resolved = path.resolve(folderPath.trim());
  for (const blocked of getBlockedAgentScanRoots()) {
    if (resolved === blocked || resolved.startsWith(`${blocked}${path.sep}`)) {
      return true;
    }
  }
  return false;
}

export function resolveAllowedAgentScanPath(folderPath: string): string {
  const resolved = path.resolve(folderPath.trim());
  if (isBlockedAgentScanPath(resolved)) {
    throw new Error(
      "The application directory cannot be used as a codebase scan folder. Choose a different project folder.",
    );
  }
  return resolved;
}

/** Neutral cwd for local agents when no explicit scan folder is configured (no codebase access). */
export function getAgentSandboxCwd(): string {
  const sandbox = path.join(os.tmpdir(), SANDBOX_DIR_NAME);
  fs.mkdirSync(sandbox, { recursive: true });
  return sandbox;
}

export function buildSystemDesignAgentWorkspace(
  scanPath: string | undefined,
  additionalDirs: string[] = [],
): LocalAiWorkspaceOptions | undefined {
  if (!scanPath?.trim()) return undefined;

  const cwd = resolveAllowedAgentScanPath(scanPath);
  const extra = additionalDirs
    .map((dir) => dir.trim())
    .filter(Boolean)
    .map((dir) => resolveAllowedAgentScanPath(dir))
    .filter((dir) => dir !== cwd);

  return {
    cwd,
    trustWorkspace: true,
    additionalDirs: extra,
  };
}
