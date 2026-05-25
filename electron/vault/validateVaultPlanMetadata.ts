import { normalizeVaultPath } from "./applyVaultIngestionPlan.ts";
import { isOverviewPath } from "./vaultStructure.ts";
import type { SemanticRelationship } from "./semanticTypes.ts";
import type { TopicAnalysisEntry, VaultIngestionPlan, VaultIngestionPlanEntry } from "./vaultTypes.ts";
import { VAULT_INGESTION_BATCH_SIZE, VAULT_INGESTION_MAX_FILES } from "./vaultTypes.ts";

function entryKeywords(entry: VaultIngestionPlanEntry): string[] {
  return entry.keywords?.length ? entry.keywords : (entry.embedding_keywords ?? []);
}

function entryTopicId(entry: VaultIngestionPlanEntry): string | undefined {
  return entry.topic_id?.trim() || entry.artifact_id?.trim() || undefined;
}

function countHeadings(body: string, heading: string): number {
  const re = new RegExp(`^##\\s+${heading}\\s*$`, "gim");
  return (body.match(re) ?? []).length;
}

function collectResolvableTargets(
  entries: VaultIngestionPlanEntry[],
  existingFiles: Record<string, string>,
): Set<string> {
  const targets = new Set<string>();
  for (const e of entries) {
    targets.add(normalizeVaultPath(e.path));
    const tid = entryTopicId(e);
    if (tid) targets.add(tid);
  }
  for (const p of Object.keys(existingFiles)) {
    targets.add(normalizeVaultPath(p));
  }
  return targets;
}

function isTopicPlanEntry(entry: VaultIngestionPlanEntry): boolean {
  return !isOverviewPath(entry.path);
}

function topicPlanEntries(plan: VaultIngestionPlan): VaultIngestionPlanEntry[] {
  return [...plan.creates, ...plan.updates].filter(isTopicPlanEntry);
}

export function validateVaultPlanMetadata(
  plan: VaultIngestionPlan,
  existingFiles: Record<string, string>,
  options?: {
    batchTopicIds?: Set<string>;
    /** All topic ids from topicAnalysis — allows cross-batch relationship targets during extraction */
    allTopicIds?: Set<string>;
    maxEntries?: number;
    batchMode?: boolean;
    mergedPlan?: boolean;
  },
): { ok: true; warnings: string[] } | { ok: false; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const allEntries = [...plan.creates, ...plan.updates];
  const topicEntries = topicPlanEntries(plan);

  if (!options?.batchMode && !options?.mergedPlan && topicEntries.length > VAULT_INGESTION_BATCH_SIZE) {
    errors.push(
      `Plan has ${topicEntries.length} topic file entries (max ${VAULT_INGESTION_BATCH_SIZE} per response). Use batched ingestion for larger imports.`,
    );
  }

  if (options?.mergedPlan) {
    if (plan.files_total_count === undefined) {
      errors.push(
        "Plan must declare files_total_count — total creates + updates including topic notes and folder overview files",
      );
    } else {
      if (allEntries.length !== plan.files_total_count) {
        errors.push(
          `Plan has ${allEntries.length} create/update entries but files_total_count is ${plan.files_total_count}`,
        );
      }
      if (plan.files_total_count < topicEntries.length) {
        errors.push(
          `files_total_count (${plan.files_total_count}) is less than topic note entries (${topicEntries.length})`,
        );
      }
    }

    if (allEntries.length > VAULT_INGESTION_MAX_FILES) {
      errors.push(`Plan has ${allEntries.length} file entries (max ${VAULT_INGESTION_MAX_FILES})`);
    }
  }

  const resolvable = collectResolvableTargets(allEntries, existingFiles);
  if (options?.allTopicIds) {
    for (const id of options.allTopicIds) {
      resolvable.add(id);
      resolvable.add(`${id}.md`);
    }
  }

  for (const entry of allEntries) {
    if (!entry.content.trim()) {
      errors.push(`Empty content for path: ${entry.path}`);
    }

    const tid = entryTopicId(entry);
    if (options?.batchTopicIds && tid && !isOverviewPath(entry.path) && !options.batchTopicIds.has(tid)) {
      errors.push(`topic_id ${tid} is not in the assigned batch topics`);
    }

    const decisionHeadings = countHeadings(entry.content, "Decision");
    const tradeoffHeadings = countHeadings(entry.content, "Trade-offs");
    if (decisionHeadings > 1 || tradeoffHeadings > 1) {
      warnings.push(
        `Entry ${entry.path} may bundle multiple ideas (multiple Decision/Trade-offs sections). Consider splitting.`,
      );
    }

    for (const rel of entry.relationships ?? []) {
      if (!resolvable.has(rel.target)) {
        const msg = options?.batchMode
          ? `Relationship target "${rel.target}" on ${entry.path} does not resolve to a topic id, planned path, or existing vault file`
          : `Relationship target "${rel.target}" on ${entry.path} does not resolve to a path or topic id`;
        if (options?.batchMode) {
          warnings.push(msg);
        } else {
          errors.push(msg);
        }
      }
    }
  }

  if (options?.mergedPlan && topicEntries.length === 0 && allEntries.length === 0) {
    errors.push("Plan must include at least one create or update entry");
  }

  if (options?.mergedPlan && topicEntries.length === 0 && allEntries.length > 0) {
    errors.push("Plan must include at least one non-overview create or update entry");
  }

  if (options?.batchMode && allEntries.length === 0) {
    errors.push("Batch plan must include at least one create or update entry");
  }

  if (errors.length > 0) return { ok: false, errors, warnings };
  return { ok: true, warnings };
}

export function validateBatchTopicsMatchPlan(
  assignedTopics: TopicAnalysisEntry[],
  plan: VaultIngestionPlan,
): { ok: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const assignedIds = new Set(assignedTopics.map((t) => t.id));
  const covered = new Set<string>();

  for (const entry of topicPlanEntries(plan)) {
    const tid = entryTopicId(entry);
    if (tid) {
      covered.add(tid);
      if (!assignedIds.has(tid)) {
        errors.push(`Plan entry references topic_id ${tid} not assigned to this batch`);
      }
    }
  }

  for (const topic of assignedTopics) {
    if (!covered.has(topic.id)) {
      warnings.push(`Assigned topic ${topic.id} has no plan entry in this batch`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function formatPlanValidationErrors(errors: string[], warnings: string[]): string {
  return [...errors.map((e) => `ERROR: ${e}`), ...warnings.map((w) => `WARN: ${w}`)].join("\n");
}
