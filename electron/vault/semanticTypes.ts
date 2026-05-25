export type SemanticArtifactType =
  | "concept"
  | "rule"
  | "overview"
  | "decision"
  | "pattern"
  | "anti_pattern"
  | "workflow"
  | "entity"
  | "glossary"
  | "incident"
  | "constraint"
  | "heuristic"
  | "mapping";

export type SemanticRelationshipType =
  | "depends_on"
  | "extends"
  | "contradicts"
  | "replaces"
  | "related_to"
  | "caused_by"
  | "enables"
  | "constrained_by";

export type SemanticRelationship = {
  type: SemanticRelationshipType;
  target: string;
};

export type SemanticArtifactMetadata = {
  confidence: "high" | "medium" | "low";
  source: "conversation" | "reference-folder" | "mixed";
  durability: "ephemeral" | "stable" | "foundational";
};

export type SemanticArtifact = {
  artifact_id: string;
  type: SemanticArtifactType;
  title: string;
  canonical_body: string;
  source_excerpt?: string;
  vault_target?: "code" | "business" | "both";
  metadata: SemanticArtifactMetadata;
  relationships: SemanticRelationship[];
  embedding_keywords: string[];
};

export type SemanticIngestion = {
  summary: string;
  vault_target?: "code" | "business" | "both";
  confidence?: "high" | "medium" | "low";
  rationale?: string;
  dedup_notes?: string;
  artifacts: SemanticArtifact[];
};

export type SemanticValidationResult =
  | { ok: true; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] };
