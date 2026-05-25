import { normalizeVaultPath } from "./applyVaultIngestionPlan.ts";
import type { SemanticRelationship } from "./semanticTypes.ts";
import type { VaultIngestionPlanEntry } from "./vaultTypes.ts";

function yamlQuote(value: string): string {
  if (/[:#\n\r]/.test(value) || value.includes('"')) {
    return JSON.stringify(value);
  }
  return value;
}

function entryKeywords(entry: VaultIngestionPlanEntry): string[] {
  return entry.keywords?.length ? entry.keywords : (entry.embedding_keywords ?? []);
}

function entryTopicId(entry: VaultIngestionPlanEntry): string | undefined {
  return entry.topic_id?.trim() || entry.artifact_id?.trim() || undefined;
}

/** Minimal YAML persisted on vault notes; relational metadata stays in ingestion YAML only. */
function buildFrontmatter(entry: VaultIngestionPlanEntry): string {
  const confidence = entry.confidence ?? "medium";
  const keywords = entryKeywords(entry);
  const lines: string[] = ["---", `confidence: ${confidence}`];
  if (keywords.length > 0) {
    lines.push("keywords:");
    for (const kw of keywords) {
      lines.push(`  - ${yamlQuote(kw)}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

function wikilinkForTarget(target: string, pathByTopicId: Map<string, string>): string {
  const path = pathByTopicId.get(target) ?? target;
  const withoutExt = path.replace(/\.md$/i, "");
  return `[[${withoutExt}]]`;
}

function ensureRelatedSection(body: string, wikilinks: string[]): string {
  const trimmed = body.trimEnd();
  if (wikilinks.length === 0) return trimmed;

  const relatedHeader = "## Related";
  const idx = trimmed.search(/^## Related\s*$/im);
  const bullets = wikilinks.map((l) => `- ${l}`).join("\n");

  if (idx >= 0) {
    const before = trimmed.slice(0, idx);
    const after = trimmed.slice(idx);
    const afterLines = after.split("\n");
    let end = afterLines.length;
    for (let i = 1; i < afterLines.length; i++) {
      if (/^##\s+/.test(afterLines[i] ?? "")) {
        end = i;
        break;
      }
    }
    const existingRelated = afterLines.slice(0, end).join("\n");
    const rest = afterLines.slice(end).join("\n");
    const merged = `${existingRelated.trimEnd()}\n${bullets}`;
    return `${before.trimEnd()}\n\n${merged}${rest ? `\n${rest}` : ""}`.trim();
  }

  return `${trimmed}\n\n${relatedHeader}\n${bullets}`;
}

function stripExistingFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  if (end < 0) return content;
  return content.slice(end + 4).trimStart();
}

function wikilinksFromRelationships(
  relationships: SemanticRelationship[] | undefined,
  pathByTopicId: Map<string, string>,
): string[] {
  return (relationships ?? []).map((r) => wikilinkForTarget(r.target, pathByTopicId));
}

export function buildVaultNoteContent(
  entry: VaultIngestionPlanEntry,
  pathByTopicId: Map<string, string>,
): string {
  let body = stripExistingFrontmatter(entry.content).trim();
  if (!body) return entry.content;

  const wikilinks = wikilinksFromRelationships(entry.relationships, pathByTopicId);
  body = ensureRelatedSection(body, wikilinks);
  const frontmatter = buildFrontmatter(entry);
  return `${frontmatter}\n\n${body}\n`;
}

export function enrichPlanEntries(
  plan: { creates: VaultIngestionPlanEntry[]; updates: VaultIngestionPlanEntry[] },
): { creates: VaultIngestionPlanEntry[]; updates: VaultIngestionPlanEntry[] } {
  const pathByTopicId = new Map<string, string>();
  for (const e of [...plan.creates, ...plan.updates]) {
    pathByTopicId.set(normalizeVaultPath(e.path), e.path);
    const tid = entryTopicId(e);
    if (tid) pathByTopicId.set(tid, e.path);
  }

  const enrich = (entries: VaultIngestionPlanEntry[]): VaultIngestionPlanEntry[] =>
    entries.map((entry) => ({
      ...entry,
      content: buildVaultNoteContent(entry, pathByTopicId),
    }));

  return {
    creates: enrich(plan.creates),
    updates: enrich(plan.updates),
  };
}
