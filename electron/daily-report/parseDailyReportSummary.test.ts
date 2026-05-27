import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DAILY_REPORT_TAXONOMY } from "./dailyReportDefaults.ts";
import {
  parseDailyReportSummaryFromReply,
  partitionDailyReportReply,
  stripDailyReportSummaryFromReply,
  validateSummaryAgainstTaxonomy,
} from "./parseDailyReportSummary.ts";

const VALID_YAML = `\`\`\`yaml
dailyReportSummary:
  narrative: "Solid dev day"
  entries:
    - hours: 3
      description: "Built calendar navigation"
      category_id: development
      task_type_id: feature-work
\`\`\``;

describe("parseDailyReportSummary", () => {
  it("parses yaml block with dailyReportSummary", () => {
    const summary = parseDailyReportSummaryFromReply(
      `Here is your report.\n\n${VALID_YAML}`,
    );
    assert.ok(summary);
    assert.equal(summary.entries.length, 1);
    assert.equal(summary.entries[0]!.hours, 3);
    assert.equal(summary.entries[0]!.categoryId, "development");
    assert.equal(summary.entries[0]!.taskTypeId, "feature-work");
    assert.equal(summary.narrative, "Solid dev day");
  });

  it("strips yaml from reply", () => {
    const clean = stripDailyReportSummaryFromReply(`Summary below.\n\n${VALID_YAML}`);
    assert.ok(!clean.includes("dailyReportSummary"));
    assert.match(clean, /Summary below/);
  });

  it("validates taxonomy ids", () => {
    const summary = parseDailyReportSummaryFromReply(VALID_YAML)!;
    assert.deepEqual(validateSummaryAgainstTaxonomy(summary, DEFAULT_DAILY_REPORT_TAXONOMY), {
      ok: true,
    });
    const bad = {
      ...summary,
      entries: [{ ...summary.entries[0]!, categoryId: "unknown", taskTypeId: "nope" }],
    };
    const result = validateSummaryAgainstTaxonomy(bad, DEFAULT_DAILY_REPORT_TAXONOMY);
    assert.equal(result.ok, false);
  });

  it("partition returns summary when valid", () => {
    const { reply, summary, parseError } = partitionDailyReportReply(
      `Done.\n\n${VALID_YAML}`,
      DEFAULT_DAILY_REPORT_TAXONOMY,
    );
    assert.ok(summary);
    assert.equal(parseError, undefined);
    assert.match(reply, /Done/);
  });

  it("partition returns parseError for invalid ids", () => {
    const invalid = `\`\`\`yaml
dailyReportSummary:
  entries:
    - hours: 1
      description: "x"
      category_id: bad
      task_type_id: bad
\`\`\``;
    const { summary, parseError } = partitionDailyReportReply(invalid, DEFAULT_DAILY_REPORT_TAXONOMY);
    assert.equal(summary, undefined);
    assert.ok(parseError);
  });
});
