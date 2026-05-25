import type { VaultIngestionPlan } from "@/types/electron-api";
import type { VaultPlanFileChange, VaultPlanProposal } from "@/types";

export function buildVaultPlanProposal(
  plan: VaultIngestionPlan,
  existingFiles: Record<string, string>,
): VaultPlanProposal {
  const changes: VaultPlanFileChange[] = [];

  for (const { path, content } of plan.creates) {
    changes.push({
      path,
      kind: "create",
      originalContent: "",
      proposedContent: content,
    });
  }

  for (const { path, content } of plan.updates) {
    changes.push({
      path,
      kind: "update",
      originalContent: existingFiles[path] ?? "",
      proposedContent: content,
    });
  }

  return {
    id: crypto.randomUUID(),
    summary: plan.summary,
    changes,
    timestamp: new Date().toISOString(),
  };
}

export function getNextVaultProposalPath(proposal: VaultPlanProposal | null): string | null {
  if (!proposal || proposal.changes.length === 0) return null;
  return proposal.changes[0]?.path ?? null;
}
