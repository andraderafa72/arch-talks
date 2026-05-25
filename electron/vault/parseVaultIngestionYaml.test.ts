import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTopicAnalysisFromReply, stripTopicAnalysisFromReply } from "./parseTopicAnalysis.ts";
import { parseVaultIngestionPlanFromReply, stripVaultPlanYamlFromReply } from "./parseVaultIngestionPlan.ts";

const TOPIC_YAML = `\`\`\`yaml
topicAnalysis:
  summary: Reference import
  total_count: 2
  topics:
    - id: redis-cache-strategy
      title: Redis caching
      type: concept
      source_anchor: "## Caching"
    - id: postgres-locks
      title: PostgreSQL locks
      type: pattern
\`\`\``;

const PLAN_YAML = `\`\`\`yaml
vaultIngestionPlan:
  summary: Batch 1
  batch_index: 1
  batch_total: 1
  files_total_count: 1
  creates:
    - path: cache/concepts/redis-strategy.md
      topic_id: redis-cache-strategy
      title: Redis caching
      type: concept
      confidence: high
      keywords:
        - redis
      content: |
        # Redis caching

        Body text here.
  updates: []
\`\`\``;

describe("vault ingestion YAML parsing", () => {
  it("parses topicAnalysis from yaml fence", () => {
    const analysis = parseTopicAnalysisFromReply(TOPIC_YAML);
    assert.ok(analysis);
    assert.equal(analysis!.topics.length, 2);
    assert.equal(analysis!.topics[0]!.id, "redis-cache-strategy");
  });

  it("parses vaultIngestionPlan from yaml fence", () => {
    const plan = parseVaultIngestionPlanFromReply(PLAN_YAML);
    assert.ok(plan);
    assert.equal(plan!.creates.length, 1);
    assert.equal(plan!.creates[0]!.path, "cache/concepts/redis-strategy.md");
    assert.equal(plan!.creates[0]!.topic_id, "redis-cache-strategy");
    assert.equal(plan!.files_total_count, 1);
    assert.match(plan!.creates[0]!.content ?? "", /Body text/);
  });

  it("strips yaml topicAnalysis fence from reply", () => {
    const reply = `Done.\n\n${TOPIC_YAML}`;
    const stripped = stripTopicAnalysisFromReply(reply);
    assert.ok(!stripped.includes("```yaml"));
    assert.match(stripped, /Done/);
  });

  it("strips yaml plan fence from reply", () => {
    const reply = `Plan ready.\n\n${PLAN_YAML}`;
    const stripped = stripVaultPlanYamlFromReply(reply);
    assert.ok(!stripped.includes("```yaml"));
    assert.match(stripped, /Plan ready/);
  });
});
