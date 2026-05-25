import { normalizeVaultPath } from "./applyVaultIngestionPlan.ts";
import type { SemanticArtifact, SemanticIngestion } from "./semanticTypes.ts";
import type { SemanticValidationResult } from "./semanticTypes.ts";
import type { VaultIngestionPlan } from "./vaultTypes.ts";

function countHeading(body: string, heading: string): number {
  const re = new RegExp(`^##\\s+${heading}\\s*$`, "gim");
  return (body.match(re) ?? []).length;
}

function collectResolvableTargets(
  artifacts: SemanticArtifact[],
  plan?: VaultIngestionPlan,
): Set<string> {
  const targets = new Set<string>();
  for (const a of artifacts) targets.add(a.artifact_id);
  if (plan) {
    for (const e of [...plan.creates, ...plan.updates]) {
      targets.add(normalizeVaultPath(e.path));
      if (e.artifact_id) targets.add(e.artifact_id);
    }
  }
  return targets;
}

export function validateSemanticIngestion(
  ir: SemanticIngestion,
  plan?: VaultIngestionPlan,
): SemanticValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();
  const resolvable = collectResolvableTargets(ir.artifacts, plan);
  const ephemeralIds = new Set<string>();

  for (const artifact of ir.artifacts) {
    if (ids.has(artifact.artifact_id)) {
      errors.push(`Duplicate artifact_id: ${artifact.artifact_id}`);
    }
    ids.add(artifact.artifact_id);

    if (!artifact.canonical_body.trim()) {
      errors.push(`Empty canonical_body for artifact: ${artifact.artifact_id}`);
    }

    if (artifact.metadata.durability === "ephemeral") {
      ephemeralIds.add(artifact.artifact_id);
    }

    const decisionHeadings = countHeading(artifact.canonical_body, "Decision");
    const tradeoffHeadings = countHeading(artifact.canonical_body, "Trade-offs");
    if (decisionHeadings > 1 || tradeoffHeadings > 1) {
      warnings.push(
        `Artifact ${artifact.artifact_id} may bundle multiple ideas (multiple Decision/Trade-offs sections). Consider splitting.`,
      );
    }

    for (const rel of artifact.relationships) {
      if (!resolvable.has(rel.target)) {
        errors.push(
          `Relationship target "${rel.target}" on ${artifact.artifact_id} does not resolve to an artifact_id or planned path`,
        );
      }
    }
  }

  if (plan) {
    const planArtifactIds = new Set<string>();
    for (const entry of [...plan.creates, ...plan.updates]) {
      if (entry.artifact_id) {
        if (ephemeralIds.has(entry.artifact_id)) {
          errors.push(`Ephemeral artifact ${entry.artifact_id} must not appear in vaultIngestionPlan`);
        }
        planArtifactIds.add(entry.artifact_id);
      }
    }
    for (const id of planArtifactIds) {
      if (!ids.has(id)) {
        warnings.push(`Plan references artifact_id ${id} not present in semanticIngestion`);
      }
    }
    if (plan.planning_from) {
      for (const id of plan.planning_from) {
        if (!ids.has(id)) {
          warnings.push(`planning_from references unknown artifact_id: ${id}`);
        }
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors, warnings };
  return { ok: true, warnings };
}

export function formatSemanticValidationErrors(
  errors: string[],
  warnings: string[],
): string {
  const lines = [...errors.map((e) => `ERROR: ${e}`), ...warnings.map((w) => `WARN: ${w}`)];
  return lines.join("\n");
}
