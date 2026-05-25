import {
  extractStructuredBlocks,
  extractStructuredObjectByKey,
  parseStructuredDocument,
} from "./extractStructuredBlocks.ts";
import type { SemanticArtifactType } from "./semanticTypes.ts";
import type { TopicAnalysis, TopicAnalysisEntry } from "./vaultTypes.ts";

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

function parseTopicRow(raw: unknown): TopicAnalysisEntry | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const title = typeof row.title === "string" ? row.title.trim() : "";
  const type = row.type;
  if (!id || !title || typeof type !== "string" || !ARTIFACT_TYPES.has(type as SemanticArtifactType)) {
    return undefined;
  }
  const entry: TopicAnalysisEntry = {
    id,
    title,
    type: type as SemanticArtifactType,
  };
  if (typeof row.source_anchor === "string" && row.source_anchor.trim()) {
    entry.source_anchor = row.source_anchor.trim();
  }
  if (typeof row.vault_hint === "string" && row.vault_hint.trim()) {
    entry.vault_hint = row.vault_hint.trim();
  }
  return entry;
}

function parseAnalysisObject(raw: unknown): TopicAnalysis | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const analysisRaw = "topicAnalysis" in obj ? obj.topicAnalysis : obj;
  if (!analysisRaw || typeof analysisRaw !== "object" || Array.isArray(analysisRaw)) return undefined;
  const a = analysisRaw as Record<string, unknown>;

  const summary = typeof a.summary === "string" ? a.summary.trim() : "";
  const topics: TopicAnalysisEntry[] = [];
  if (Array.isArray(a.topics)) {
    for (const item of a.topics) {
      const parsed = parseTopicRow(item);
      if (parsed) topics.push(parsed);
    }
  }

  const total_count =
    typeof a.total_count === "number" && Number.isFinite(a.total_count)
      ? Math.max(0, Math.floor(a.total_count))
      : topics.length;

  if (topics.length === 0 && total_count === 0) return undefined;

  return {
    summary: summary || "Topic analysis",
    total_count: Math.max(total_count, topics.length),
    topics,
  };
}

export function parseTopicAnalysisFromReply(reply: string): TopicAnalysis | undefined {
  for (const block of extractStructuredBlocks(reply)) {
    const parsed = parseStructuredDocument(block);
    if (!parsed) continue;
    const analysis = parseAnalysisObject(parsed);
    if (analysis) return analysis;
  }

  const keyed = extractStructuredObjectByKey(reply, "topicAnalysis");
  if (keyed) return parseAnalysisObject(keyed);

  return undefined;
}

export function stripTopicAnalysisFromReply(reply: string): string {
  let out = reply
    .replace(/```ya?ml\s*[\s\S]*?topicAnalysis[\s\S]*?```/gi, "")
    .replace(/```json\s*[\s\S]*?"topicAnalysis"[\s\S]*?```/g, "")
    .trim();
  out = out.replace(/\n{3,}/g, "\n\n").trim();
  return out;
}

export function validateTopicAnalysis(analysis: TopicAnalysis): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const topic of analysis.topics) {
    if (ids.has(topic.id)) {
      errors.push(`Duplicate topic id: ${topic.id}`);
    }
    ids.add(topic.id);
    if (!topic.title.trim()) {
      errors.push(`Empty title for topic: ${topic.id}`);
    }
  }
  if (analysis.topics.length === 0) {
    errors.push("topicAnalysis must list at least one topic");
  }
  return { ok: errors.length === 0, errors };
}
