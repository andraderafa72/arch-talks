import type {
  SemanticArtifact,
  SemanticArtifactMetadata,
  SemanticArtifactType,
  SemanticIngestion,
  SemanticRelationship,
  SemanticRelationshipType,
} from "./semanticTypes.ts";
import {
  extractStructuredBlocks,
  extractStructuredObjectByKey,
  parseStructuredDocument,
} from "./extractStructuredBlocks.ts";

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

function parseVaultTarget(v: unknown): SemanticIngestion["vault_target"] | undefined {
  if (v === "code" || v === "business" || v === "both") return v;
  return undefined;
}

function parseConfidence(v: unknown): SemanticIngestion["confidence"] | undefined {
  if (v === "high" || v === "medium" || v === "low") return v;
  return undefined;
}

function parseMetadata(raw: unknown): SemanticArtifactMetadata | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const m = raw as Record<string, unknown>;
  const confidence = parseConfidence(m.confidence);
  const source =
    m.source === "conversation" || m.source === "reference-folder" || m.source === "mixed"
      ? m.source
      : undefined;
  const durability =
    m.durability === "ephemeral" || m.durability === "stable" || m.durability === "foundational"
      ? m.durability
      : undefined;
  if (!confidence || !source || !durability) return undefined;
  return { confidence, source, durability };
}

function parseRelationships(v: unknown): SemanticRelationship[] {
  if (!Array.isArray(v)) return [];
  const out: SemanticRelationship[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const type = row.type;
    const target = row.target;
    if (typeof type !== "string" || !RELATIONSHIP_TYPES.has(type as SemanticRelationshipType)) continue;
    if (typeof target !== "string" || !target.trim()) continue;
    out.push({ type: type as SemanticRelationshipType, target: target.trim() });
  }
  return out;
}

function parseKeywords(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((k): k is string => typeof k === "string" && k.trim().length > 0).map((k) => k.trim());
}

function parseArtifact(raw: unknown): SemanticArtifact | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const a = raw as Record<string, unknown>;
  const artifact_id = typeof a.artifact_id === "string" ? a.artifact_id.trim() : "";
  const type = a.type;
  const title = typeof a.title === "string" ? a.title.trim() : "";
  const canonical_body = typeof a.canonical_body === "string" ? a.canonical_body : "";
  const metadata = parseMetadata(a.metadata);
  if (!artifact_id || typeof type !== "string" || !ARTIFACT_TYPES.has(type as SemanticArtifactType)) {
    return undefined;
  }
  if (!title || !canonical_body.trim() || !metadata) return undefined;

  return {
    artifact_id,
    type: type as SemanticArtifactType,
    title,
    canonical_body,
    source_excerpt: typeof a.source_excerpt === "string" ? a.source_excerpt : undefined,
    vault_target: parseVaultTarget(a.vault_target),
    metadata,
    relationships: parseRelationships(a.relationships),
    embedding_keywords: parseKeywords(a.embedding_keywords),
  };
}

function parseSemanticObject(raw: unknown): SemanticIngestion | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const irRaw = "semanticIngestion" in obj ? obj.semanticIngestion : obj;
  if (!irRaw || typeof irRaw !== "object" || Array.isArray(irRaw)) return undefined;
  const ir = irRaw as Record<string, unknown>;

  const summary = typeof ir.summary === "string" ? ir.summary.trim() : "";
  const artifacts: SemanticArtifact[] = [];
  if (Array.isArray(ir.artifacts)) {
    for (const item of ir.artifacts) {
      const parsed = parseArtifact(item);
      if (parsed) artifacts.push(parsed);
    }
  }
  if (artifacts.length === 0 && !summary) return undefined;

  return {
    summary: summary || "Semantic ingestion",
    vault_target: parseVaultTarget(ir.vault_target),
    confidence: parseConfidence(ir.confidence),
    rationale: typeof ir.rationale === "string" ? ir.rationale : undefined,
    dedup_notes: typeof ir.dedup_notes === "string" ? ir.dedup_notes : undefined,
    artifacts,
  };
}

export function parseSemanticIngestionFromReply(reply: string): SemanticIngestion | undefined {
  for (const block of extractStructuredBlocks(reply)) {
    const parsed = parseStructuredDocument(block);
    if (!parsed) continue;
    const ir = parseSemanticObject(parsed);
    if (ir) return ir;
  }

  const keyed = extractStructuredObjectByKey(reply, "semanticIngestion");
  if (keyed) return parseSemanticObject(keyed);

  return undefined;
}

export function stripSemanticJsonFromReply(reply: string): string {
  let out = reply
    .replace(/```ya?ml\s*[\s\S]*?semanticIngestion[\s\S]*?```/gi, "")
    .replace(/```json\s*[\s\S]*?"semanticIngestion"[\s\S]*?```/g, "")
    .trim();
  out = out.replace(/\n{3,}/g, "\n\n").trim();
  return out;
}
