import type { VaultIngestionPlan } from "./vaultTypes.ts";
import { normalizeVaultPath } from "./applyVaultIngestionPlan.ts";

export function mergeBatchPlans(plans: VaultIngestionPlan[]): {
  plan: VaultIngestionPlan;
  warnings: string[];
} {
  const warnings: string[] = [];
  const createByPath = new Map<string, VaultIngestionPlan["creates"][number]>();
  const updateByPath = new Map<string, VaultIngestionPlan["updates"][number]>();

  for (const batch of plans) {
    for (const entry of batch.creates) {
      const key = normalizeVaultPath(entry.path);
      if (createByPath.has(key) || updateByPath.has(key)) {
        warnings.push(`Duplicate path in merged plan (create): ${entry.path}`);
      }
      createByPath.set(key, entry);
    }
    for (const entry of batch.updates) {
      const key = normalizeVaultPath(entry.path);
      if (createByPath.has(key)) {
        createByPath.delete(key);
        warnings.push(`Path ${entry.path} appeared as create then update; keeping update`);
      }
      if (updateByPath.has(key)) {
        warnings.push(`Duplicate path in merged plan (update): ${entry.path}`);
      }
      updateByPath.set(key, entry);
    }
  }

  const summaries = plans.map((p) => p.summary).filter(Boolean);
  return {
    plan: {
      summary: summaries[0] ?? "Vault ingestion plan",
      creates: [...createByPath.values()],
      updates: [...updateByPath.values()],
    },
    warnings,
  };
}
