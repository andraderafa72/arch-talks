import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { getChatFolderPath } from "../architectureFileIo.ts";
import type { PromptId } from "./promptRegistry.ts";

const OVERRIDES_DIR = "prompt-overrides";
const GLOBAL_OVERRIDES_DIR = "global-prompt-overrides";
const MANIFEST_FILE = "manifest.json";

export type PromptOverrideScope =
  | { kind: "global" }
  | { kind: "document"; documentId: string };

export type PromptOverrideSegmentEntry = {
  enabled: boolean;
  file: string;
};

export type PromptOverrideEntry = {
  enabled: boolean;
  mode: "full" | "segments";
  file?: string;
  segments?: Record<string, PromptOverrideSegmentEntry>;
  updatedAt: string;
};

export type PromptOverridesManifest = {
  version: 1;
  revision: number;
  prompts: Partial<Record<PromptId, PromptOverrideEntry>>;
};

export type PromptOverrideSnapshot = {
  manifest: PromptOverridesManifest;
  contents: Partial<Record<PromptId, { full?: string; segments?: Record<string, string> }>>;
};

export type PromptOverrideSaveRequest = {
  documentId?: string;
  scope?: PromptOverrideScope;
  promptId: PromptId;
  mode: "full" | "segments";
  content?: string;
  segmentId?: string;
  enabled?: boolean;
};

function emptyManifest(): PromptOverridesManifest {
  return {
    version: 1,
    revision: 0,
    prompts: {},
  };
}

function sanitizePromptFilePart(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "prompt";
}

function documentScope(documentId: string): PromptOverrideScope {
  return { kind: "document", documentId };
}

function scopeFromRequest(req: { documentId?: string; scope?: PromptOverrideScope }): PromptOverrideScope {
  if (req.scope) return req.scope;
  if (req.documentId?.trim()) return documentScope(req.documentId.trim());
  throw new Error("documentId is required for document prompt overrides");
}

async function overridesRoot(scope: PromptOverrideScope): Promise<string> {
  if (scope.kind === "global") {
    return path.join(app.getPath("userData"), GLOBAL_OVERRIDES_DIR);
  }
  const filesRoot = await getChatFolderPath(scope.documentId);
  return path.join(path.dirname(filesRoot), OVERRIDES_DIR);
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function normalizeManifest(value: PromptOverridesManifest): PromptOverridesManifest {
  if (!value || value.version !== 1 || typeof value.revision !== "number" || !value.prompts) {
    return emptyManifest();
  }
  return {
    version: 1,
    revision: value.revision,
    prompts: value.prompts,
  };
}

async function writeManifest(root: string, manifest: PromptOverridesManifest): Promise<void> {
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(path.join(root, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function fullFileName(promptId: PromptId): string {
  return `${sanitizePromptFilePart(promptId)}.md`;
}

function segmentFileName(promptId: PromptId, segmentId: string): string {
  return `${sanitizePromptFilePart(promptId)}.${sanitizePromptFilePart(segmentId)}.md`;
}

async function readManifestFromRoot(root: string): Promise<PromptOverridesManifest> {
  const manifest = await readJsonFile<PromptOverridesManifest>(path.join(root, MANIFEST_FILE), emptyManifest());
  return normalizeManifest(manifest);
}

async function safeReadContent(root: string, relFile: string | undefined): Promise<string | undefined> {
  if (!relFile) return undefined;
  const resolved = path.resolve(root, relFile);
  const rootResolved = path.resolve(root);
  if (!resolved.startsWith(rootResolved + path.sep) && resolved !== rootResolved) return undefined;
  return fs.readFile(resolved, "utf8").catch(() => undefined);
}

export async function readScopedPromptOverrides(scope: PromptOverrideScope): Promise<PromptOverrideSnapshot> {
  const root = await overridesRoot(scope);
  const manifest = await readManifestFromRoot(root);
  const contents: PromptOverrideSnapshot["contents"] = {};
  for (const [promptId, entry] of Object.entries(manifest.prompts) as Array<[PromptId, PromptOverrideEntry]>) {
    const full = await safeReadContent(root, entry.file);
    const segments: Record<string, string> = {};
    for (const [segmentId, segment] of Object.entries(entry.segments ?? {})) {
      const content = await safeReadContent(root, segment.file);
      if (content !== undefined) segments[segmentId] = content;
    }
    contents[promptId] = {
      ...(full !== undefined ? { full } : {}),
      ...(Object.keys(segments).length > 0 ? { segments } : {}),
    };
  }
  return { manifest, contents };
}

export async function readPromptOverrides(documentId: string): Promise<PromptOverrideSnapshot> {
  return readScopedPromptOverrides(documentScope(documentId));
}

export async function readGlobalPromptOverrides(): Promise<PromptOverrideSnapshot> {
  return readScopedPromptOverrides({ kind: "global" });
}

export async function savePromptOverride(req: PromptOverrideSaveRequest): Promise<PromptOverridesManifest> {
  const root = await overridesRoot(scopeFromRequest(req));
  const manifest = await readManifestFromRoot(root);
  const now = new Date().toISOString();
  const existing = manifest.prompts[req.promptId] ?? {
    enabled: true,
    mode: req.mode,
    updatedAt: now,
  };

  if (req.mode === "full") {
    const file = existing.file ?? fullFileName(req.promptId);
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(path.join(root, file), req.content ?? "", "utf8");
    manifest.prompts[req.promptId] = {
      enabled: req.enabled ?? existing.enabled ?? true,
      mode: "full",
      file,
      segments: existing.segments,
      updatedAt: now,
    };
  } else {
    if (!req.segmentId?.trim()) throw new Error("segmentId is required for segmented overrides");
    const file = existing.segments?.[req.segmentId]?.file ?? segmentFileName(req.promptId, req.segmentId);
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(path.join(root, file), req.content ?? "", "utf8");
    manifest.prompts[req.promptId] = {
      enabled: req.enabled ?? existing.enabled ?? true,
      mode: "segments",
      file: existing.file,
      segments: {
        ...(existing.segments ?? {}),
        [req.segmentId]: {
          enabled: req.enabled ?? existing.segments?.[req.segmentId]?.enabled ?? true,
          file,
        },
      },
      updatedAt: now,
    };
  }

  manifest.revision += 1;
  await writeManifest(root, manifest);
  return manifest;
}

export async function setPromptOverrideEnabled(
  documentId: string,
  promptId: PromptId,
  enabled: boolean,
  segmentId?: string,
): Promise<PromptOverridesManifest> {
  return setScopedPromptOverrideEnabled(documentScope(documentId), promptId, enabled, segmentId);
}

export async function setScopedPromptOverrideEnabled(
  scope: PromptOverrideScope,
  promptId: PromptId,
  enabled: boolean,
  segmentId?: string,
): Promise<PromptOverridesManifest> {
  const root = await overridesRoot(scope);
  const manifest = await readManifestFromRoot(root);
  const entry = manifest.prompts[promptId];
  if (!entry) return manifest;
  if (segmentId?.trim()) {
    const segment = entry.segments?.[segmentId];
    if (!segment) return manifest;
    segment.enabled = enabled;
  } else {
    entry.enabled = enabled;
  }
  entry.updatedAt = new Date().toISOString();
  manifest.revision += 1;
  await writeManifest(root, manifest);
  return manifest;
}

export async function deletePromptOverride(
  documentId: string,
  promptId: PromptId,
  segmentId?: string,
): Promise<PromptOverridesManifest> {
  return deleteScopedPromptOverride(documentScope(documentId), promptId, segmentId);
}

export async function deleteScopedPromptOverride(
  scope: PromptOverrideScope,
  promptId: PromptId,
  segmentId?: string,
): Promise<PromptOverridesManifest> {
  const root = await overridesRoot(scope);
  const manifest = await readManifestFromRoot(root);
  const entry = manifest.prompts[promptId];
  if (!entry) return manifest;

  if (segmentId?.trim()) {
    const segment = entry.segments?.[segmentId];
    if (segment) {
      await fs.rm(path.join(root, segment.file), { force: true }).catch(() => undefined);
      delete entry.segments?.[segmentId];
      entry.updatedAt = new Date().toISOString();
    }
  } else {
    if (entry.file) await fs.rm(path.join(root, entry.file), { force: true }).catch(() => undefined);
    for (const segment of Object.values(entry.segments ?? {})) {
      await fs.rm(path.join(root, segment.file), { force: true }).catch(() => undefined);
    }
    delete manifest.prompts[promptId];
  }

  manifest.revision += 1;
  await writeManifest(root, manifest);
  return manifest;
}
