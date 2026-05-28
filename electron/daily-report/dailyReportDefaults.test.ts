import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CANONICAL_TAXONOMY_BY_CATEGORY,
  DEFAULT_DAILY_REPORT_TAXONOMY,
  mergeTaxonomyWithDefaults,
} from "./dailyReportDefaults.ts";
import { slugFromLabel } from "./dailyReportTypes.ts";

describe("dailyReportDefaults", () => {
  it("includes every canonical category and task type", () => {
    const categoryLabels = new Set(DEFAULT_DAILY_REPORT_TAXONOMY.categories.map((c) => c.label));
    for (const label of Object.keys(CANONICAL_TAXONOMY_BY_CATEGORY)) {
      assert.ok(categoryLabels.has(label), `missing category: ${label}`);
    }

    for (const [categoryLabel, typeLabels] of Object.entries(CANONICAL_TAXONOMY_BY_CATEGORY)) {
      const categoryId = slugFromLabel(categoryLabel);
      const available = new Set(
        DEFAULT_DAILY_REPORT_TAXONOMY.taskTypes
          .filter((t) => t.categoryId === categoryId)
          .map((t) => t.label),
      );
      for (const typeLabel of typeLabels) {
        assert.ok(available.has(typeLabel), `missing task type: ${categoryLabel} → ${typeLabel}`);
      }
    }
  });

  it("mergeTaxonomyWithDefaults adds missing canonical items", () => {
    const partial = {
      version: 1 as const,
      categories: DEFAULT_DAILY_REPORT_TAXONOMY.categories.slice(0, 1),
      taskTypes: DEFAULT_DAILY_REPORT_TAXONOMY.taskTypes.slice(0, 1),
    };
    const merged = mergeTaxonomyWithDefaults(partial);
    assert.equal(merged.categories.length, DEFAULT_DAILY_REPORT_TAXONOMY.categories.length);
    assert.equal(merged.taskTypes.length, DEFAULT_DAILY_REPORT_TAXONOMY.taskTypes.length);
  });
});
