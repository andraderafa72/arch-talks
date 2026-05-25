import type { SemanticArtifactType, SemanticRelationship } from "./semanticTypes.ts";

export type TopicAnalysisEntry = {
  id: string;
  title: string;
  type: SemanticArtifactType;
  source_anchor?: string;
  vault_hint?: string;
};

export type TopicAnalysis = {
  summary: string;
  total_count: number;
  topics: TopicAnalysisEntry[];
};

export type VaultIngestionPlanEntry = {
  path: string;
  content: string;
  topic_id?: string;
  title?: string;
  type?: SemanticArtifactType;
  confidence?: "high" | "medium" | "low";
  keywords?: string[];
  /** @deprecated alias for keywords */
  embedding_keywords?: string[];
  relationships?: SemanticRelationship[];
  /** @deprecated alias for topic_id */
  artifact_id?: string;
};

export type VaultIngestionPlan = {
  summary: string;
  batch_index?: number;
  batch_total?: number;
  /** Model-declared total of creates + updates (topic notes and overview files). */
  files_total_count?: number;
  creates: VaultIngestionPlanEntry[];
  updates: VaultIngestionPlanEntry[];
};

export type VaultPlanFileChange = {
  path: string;
  kind: "create" | "update";
  originalContent: string;
  proposedContent: string;
};

export type VaultPlanProposal = {
  id: string;
  summary: string;
  changes: VaultPlanFileChange[];
  timestamp: string;
};

export type VaultConfirmedChange = {
  path: string;
  content: string;
};

export type VaultIngestionSummary = {
  topicCount: number;
  batches: number;
  filesReady: number;
  declaredFileCount?: number;
  topics: { title: string; type: string }[];
};

export const VAULT_INGESTION_BATCH_SIZE = 5;
export const VAULT_INGESTION_MAX_BATCHES = 6;
/** Max topic note files per ingestion run. Overview files are extra; see files_total_count on the plan. */
export const VAULT_INGESTION_MAX_TOPICS = VAULT_INGESTION_BATCH_SIZE * VAULT_INGESTION_MAX_BATCHES;
/** Safety cap for all plan entries (topic notes + overview creates/updates). */
export const VAULT_INGESTION_MAX_FILES = VAULT_INGESTION_MAX_TOPICS * 2;
