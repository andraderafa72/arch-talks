import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  blockPlanTotals,
  expandBlockPlanHours,
  validateSummaryAgainstBlockPlan,
} from "./dailyReportBlockPlan.ts";
import type { DailyReportSummary } from "./dailyReportTypes.ts";

describe("dailyReportBlockPlan", () => {
  it("totals 1x2h + 7x1h", () => {
    const plan = [
      { hours: 2, count: 1 },
      { hours: 1, count: 7 },
    ];
    assert.deepEqual(blockPlanTotals(plan), { blockCount: 8, totalHours: 9 });
    assert.deepEqual(expandBlockPlanHours(plan), [2, 1, 1, 1, 1, 1, 1, 1]);
  });

  it("validates matching summary hours", () => {
    const plan = [
      { hours: 2, count: 1 },
      { hours: 1, count: 2 },
    ];
    const summary: DailyReportSummary = {
      entries: [
        { hours: 2, description: "a", categoryId: "development", taskTypeId: "features-development" },
        { hours: 1, description: "b", categoryId: "development", taskTypeId: "bug-fixing" },
        { hours: 1, description: "c", categoryId: "internal-process", taskTypeId: "technical-screenings" },
      ],
    };
    assert.deepEqual(validateSummaryAgainstBlockPlan(summary, plan), { ok: true });
  });

  it("rejects wrong entry count", () => {
    const plan = [{ hours: 1, count: 2 }];
    const summary: DailyReportSummary = {
      entries: [{ hours: 1, description: "a", categoryId: "development", taskTypeId: "features-development" }],
    };
    const result = validateSummaryAgainstBlockPlan(summary, plan);
    assert.equal(result.ok, false);
  });
});
