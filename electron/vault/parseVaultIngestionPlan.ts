import type { SemanticArtifactType, SemanticRelationship, SemanticRelationshipType } from "./semanticTypes.ts";
import type { VaultIngestionPlan, VaultIngestionPlanEntry } from "./vaultTypes.ts";
import { normalizeVaultPath } from "./applyVaultIngestionPlan.ts";
import {
  extractStructuredBlocks,
  extractStructuredObjectByKey,
  parseStructuredDocument,
} from "./extractStructuredBlocks.ts";

const RELATIONSHIP_TYPES = new Set<SemanticRelationshipType>([
  "depends_on",
  "extends",
  "contradicts",
  "replaces",
  "related_to",
  "caused_by",
  "enables",
  "constrained_by",
]);

const ARTIFACT_TYPES = new Set<SemanticArtifactType>([
  "concept",
  "rule",
  "overview",
  "decision",
  "pattern",
  "anti_pattern",
  "workflow",
  "entity",
  "glossary",
  "incident",
  "constraint",
  "heuristic",
  "mapping",
]);

function parseConfidence(v: unknown): VaultIngestionPlanEntry["confidence"] | undefined {
  if (v === "high" || v === "medium" || v === "low") return v;
  return undefined;
}

function parseKeywords(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const kw = v.filter((k): k is string => typeof k === "string" && k.trim().length > 0).map((k) => k.trim());
  return kw.length > 0 ? kw : undefined;
}

function parseRelationships(v: unknown): SemanticRelationship[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: SemanticRelationship[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const type = r.type;
    const target = typeof r.target === "string" ? r.target.trim() : "";
    if (typeof type === "string" && RELATIONSHIP_TYPES.has(type as SemanticRelationshipType) && target) {
      out.push({ type: type as SemanticRelationshipType, target });
    }
  }
  return out.length > 0 ? out : undefined;
}

function parseEntry(row: Record<string, unknown>): VaultIngestionPlanEntry | undefined {
  if (typeof row.path !== "string" || typeof row.content !== "string") return undefined;
  const entry: VaultIngestionPlanEntry = {
    path: normalizeVaultPath(row.path),
    content: row.content,
  };
  if (typeof row.topic_id === "string" && row.topic_id.trim()) {
    entry.topic_id = row.topic_id.trim();
  } else if (typeof row.artifact_id === "string" && row.artifact_id.trim()) {
    entry.artifact_id = row.artifact_id.trim();
  }
  if (typeof row.title === "string" && row.title.trim()) entry.title = row.title.trim();
  const type = row.type;
  if (typeof type === "string" && ARTIFACT_TYPES.has(type as SemanticArtifactType)) {
    entry.type = type as SemanticArtifactType;
  }
  const confidence = parseConfidence(row.confidence);
  if (confidence) entry.confidence = confidence;
  const keywords = parseKeywords(row.keywords) ?? parseKeywords(row.embedding_keywords);
  if (keywords) {
    entry.keywords = keywords;
    entry.embedding_keywords = keywords;
  }
  const relationships = parseRelationships(row.relationships);
  if (relationships) entry.relationships = relationships;
  return entry;
}

function parseEntries(v: unknown): VaultIngestionPlanEntry[] {
  if (!Array.isArray(v)) return [];
  const out: VaultIngestionPlanEntry[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const parsed = parseEntry(item as Record<string, unknown>);
    if (parsed) out.push(parsed);
  }
  return out;
}

function parsePlanObject(raw: unknown): VaultIngestionPlan | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const planRaw = "vaultIngestionPlan" in obj ? obj.vaultIngestionPlan : obj;
  if (!planRaw || typeof planRaw !== "object" || Array.isArray(planRaw)) return undefined;
  const p = planRaw as Record<string, unknown>;

  const summary = typeof p.summary === "string" ? p.summary.trim() : "";
  const creates = parseEntries(p.creates);
  const updates = parseEntries(p.updates);
  if (!summary && creates.length === 0 && updates.length === 0) return undefined;

  const plan: VaultIngestionPlan = {
    summary: summary || "Vault ingestion plan",
    creates,
    updates,
  };
  if (typeof p.batch_index === "number") plan.batch_index = p.batch_index;
  if (typeof p.batch_total === "number") plan.batch_total = p.batch_total;
  if (typeof p.files_total_count === "number" && Number.isFinite(p.files_total_count)) {
    plan.files_total_count = Math.max(0, Math.floor(p.files_total_count));
  }
  return plan;
}

export function parseVaultIngestionPlanFromReply(reply: string): VaultIngestionPlan | undefined {
  for (const block of extractStructuredBlocks(reply)) {
    const parsed = parseStructuredDocument(block);
    if (!parsed) continue;
    const plan = parsePlanObject(parsed);
    if (plan) return plan;
  }

  const keyed = extractStructuredObjectByKey(reply, "vaultIngestionPlan");
  if (keyed) return parsePlanObject(keyed);

  return undefined;
}

export function stripVaultPlanYamlFromReply(reply: string): string {
  let out = reply
    .replace(/```ya?ml\s*[\s\S]*?vaultIngestionPlan[\s\S]*?```/gi, "")
    .replace(/```json\s*[\s\S]*?"vaultIngestionPlan"[\s\S]*?```/g, "")
    .trim();
  out = out.replace(/\n{3,}/g, "\n\n").trim();
  return out;
}

/** @deprecated use stripVaultPlanYamlFromReply */
export const stripVaultPlanJsonFromReply = stripVaultPlanYamlFromReply;
