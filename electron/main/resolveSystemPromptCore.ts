import type { PromptId } from "./promptRegistry.ts";
import { getPromptCatalogItem } from "./promptRegistry.ts";
import type { PromptOverrideSnapshot } from "./promptOverridesIo.ts";

export type ResolveSystemPromptCoreOptions = {
  promptId: PromptId;
  defaultPrompt: string;
  segments?: Record<string, string>;
  placeholders?: Record<string, string | undefined>;
  globalSnapshot?: PromptOverrideSnapshot;
  documentSnapshot?: PromptOverrideSnapshot;
};

function interpolateTemplate(content: string, placeholders: Record<string, string | undefined>): string {
  return content.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => placeholders[key] ?? "");
}

function joinSegments(segments: Record<string, string>, order: string[]): string {
  return order
    .map((id) => segments[id]?.trim())
    .filter(Boolean)
    .join("\n\n");
}

function fullOverride(
  snapshot: PromptOverrideSnapshot | undefined,
  promptId: PromptId,
  placeholders: Record<string, string | undefined>,
): string | undefined {
  const entry = snapshot?.manifest.prompts[promptId];
  const content = snapshot?.contents[promptId];
  if (!entry?.enabled || entry.mode !== "full" || content?.full === undefined) return undefined;
  return interpolateTemplate(content.full, placeholders).trim();
}

function applySegmentOverrides(
  merged: Record<string, string>,
  snapshot: PromptOverrideSnapshot | undefined,
  promptId: PromptId,
  placeholders: Record<string, string | undefined>,
): { segments: Record<string, string>; applied: boolean } {
  const entry = snapshot?.manifest.prompts[promptId];
  const content = snapshot?.contents[promptId];
  if (!entry?.enabled || entry.mode !== "segments") return { segments: merged, applied: false };

  const next = { ...merged };
  let applied = false;
  for (const [segmentId, segment] of Object.entries(entry.segments ?? {})) {
    const override = content?.segments?.[segmentId];
    if (!segment.enabled || override === undefined) continue;
    next[segmentId] = interpolateTemplate(override, placeholders);
    applied = true;
  }
  return { segments: next, applied };
}

export function resolveSystemPromptFromSnapshots(options: ResolveSystemPromptCoreOptions): string {
  const placeholders = options.placeholders ?? {};
  const documentFull = fullOverride(options.documentSnapshot, options.promptId, placeholders);
  if (documentFull !== undefined) return documentFull || options.defaultPrompt;

  const globalFull = fullOverride(options.globalSnapshot, options.promptId, placeholders);
  if (globalFull !== undefined) return globalFull || options.defaultPrompt;

  if (!options.segments) return options.defaultPrompt;

  const catalog = getPromptCatalogItem(options.promptId);
  const withGlobal = applySegmentOverrides({ ...options.segments }, options.globalSnapshot, options.promptId, placeholders);
  const withDocument = applySegmentOverrides(withGlobal.segments, options.documentSnapshot, options.promptId, placeholders);
  if (!withGlobal.applied && !withDocument.applied) return options.defaultPrompt;
  const resolved = joinSegments(withDocument.segments, catalog.segments.map((segment) => segment.id));
  return resolved || options.defaultPrompt;
}
