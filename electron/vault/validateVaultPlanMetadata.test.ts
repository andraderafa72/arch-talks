import assert from "node:assert/strict";
import { test } from "node:test";
import type { VaultIngestionPlan } from "./vaultTypes.ts";
import { validateVaultPlanMetadata } from "./validateVaultPlanMetadata.ts";

function planWith(entries: { path: string; topic_id?: string; content?: string }[]): VaultIngestionPlan {
  return {
    summary: "test",
    batch_index: 1,
    batch_total: 1,
    files_total_count: entries.length,
    creates: entries.map((e) => ({
      path: e.path,
      content: e.content ?? "body",
      topic_id: e.topic_id,
    })),
    updates: [],
  };
}

test("validateVaultPlanMetadata accepts topic notes plus overview files when files_total_count matches", () => {
  const plan = planWith([
    { path: "avoca/call-flow/architecture.md", topic_id: "call-flow-arch" },
    { path: "avoca/call-flow/call-flow-overview.md" },
    { path: "avoca/post-call-pipeline/webhook.md", topic_id: "post-call-webhook" },
    { path: "avoca/post-call-pipeline/post-call-pipeline-overview.md" },
  ]);
  plan.files_total_count = 4;

  const result = validateVaultPlanMetadata(plan, {}, { mergedPlan: true, allTopicIds: new Set(["call-flow-arch", "post-call-webhook"]) });
  assert.equal(result.ok, true);
});

test("validateVaultPlanMetadata rejects when files_total_count does not match entries", () => {
  const plan = planWith([{ path: "avoca/note.md", topic_id: "note" }]);
  plan.files_total_count = 3;

  const result = validateVaultPlanMetadata(plan, {}, { mergedPlan: true });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.errors.join(" "), /files_total_count is 3/);
  }
});

test("validateVaultPlanMetadata requires files_total_count on merged plans", () => {
  const plan = planWith([{ path: "avoca/note.md", topic_id: "note" }]);
  delete plan.files_total_count;

  const result = validateVaultPlanMetadata(plan, {}, { mergedPlan: true });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.errors.join(" "), /files_total_count/);
  }
});
