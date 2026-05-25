import { enrichPlanEntries } from "./buildVaultNoteContent.ts";
import { parseVaultIngestionPlanFromReply, stripVaultPlanYamlFromReply } from "./parseVaultIngestionPlan.ts";
import { stripTopicAnalysisFromReply } from "./parseTopicAnalysis.ts";
import {
  formatPlanValidationErrors,
  validateVaultPlanMetadata,
} from "./validateVaultPlanMetadata.ts";
import { validateVaultIngestionPlanByCategory } from "./vaultCategoryValidation.ts";
import type { VaultCategory } from "./archConfig.ts";
import { validateVaultIngestionPlan } from "./vaultStructure.ts";
import type { VaultIngestionPlan } from "./vaultTypes.ts";

export type VaultIngestionBundle = {
  plan?: VaultIngestionPlan;
};

export function parseVaultIngestionReply(rawReply: string): VaultIngestionBundle {
  return {
    plan: parseVaultIngestionPlanFromReply(rawReply),
  };
}

export function stripIngestionYamlFromReply(reply: string): string {
  let out = stripTopicAnalysisFromReply(reply);
  out = stripVaultPlanYamlFromReply(out);
  return out.trim() || reply.trim();
}

/** @deprecated use stripIngestionYamlFromReply */
export const stripIngestionJsonFromReply = stripIngestionYamlFromReply;

export function finalizeVaultIngestionPlan(
  plan: VaultIngestionPlan,
  existingFiles: Record<string, string>,
  category?: VaultCategory | null,
  options?: { batchMode?: boolean },
): { plan: VaultIngestionPlan; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const metaResult = validateVaultPlanMetadata(plan, existingFiles, {
    batchMode: options?.batchMode,
    mergedPlan: options?.batchMode ? false : true,
  });
  warnings.push(...metaResult.warnings);
  if (!metaResult.ok) {
    errors.push(...metaResult.errors);
    return { plan, errors, warnings };
  }

  const enriched = enrichPlanEntries(plan);
  const enrichedPlan: VaultIngestionPlan = {
    ...plan,
    creates: enriched.creates,
    updates: enriched.updates,
  };

  const structureResult = validateVaultIngestionPlan(enrichedPlan, existingFiles);
  if (!structureResult.ok) {
    errors.push(...structureResult.errors);
    return { plan: enrichedPlan, errors, warnings };
  }

  if (category) {
    const categoryResult = validateVaultIngestionPlanByCategory(enrichedPlan, category);
    if (!categoryResult.ok) {
      errors.push(...categoryResult.errors);
      return { plan: enrichedPlan, errors, warnings };
    }
  }

  return { plan: enrichedPlan, errors, warnings };
}

export function buildVaultIngestionCorrectivePrompt(options: {
  errors: string[];
  warnings: string[];
  previousReply: string;
  phase: "topicAnalysis" | "vaultIngestionPlan";
}): string {
  const validationText = formatPlanValidationErrors(options.errors, options.warnings);
  const key = options.phase === "topicAnalysis" ? "topicAnalysis" : "vaultIngestionPlan";
  return `Your previous vault ingestion output failed validation. Fix and re-emit a single \`\`\`yaml block with only ${key}.

Validation report:
${validationText}

Previous assistant output (for reference):
---
${options.previousReply.slice(0, 12000)}
---

Re-emit corrected YAML. No conversational text outside the fence.`;
}
