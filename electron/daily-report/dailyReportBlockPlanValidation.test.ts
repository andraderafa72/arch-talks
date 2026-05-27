import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseCountDraft,
  parseHoursDraft,
  validateBlockPlanDrafts,
  validateCountDraft,
  validateHoursDraft,
} from "../../src/renderer/lib/dailyReportBlockPlanValidation.ts";

describe("dailyReportBlockPlanValidation", () => {
  it("allows empty draft strings while editing", () => {
    assert.equal(validateHoursDraft(""), "empty");
    assert.equal(validateCountDraft(""), "empty");
    assert.equal(parseHoursDraft(""), undefined);
    assert.equal(parseCountDraft(""), undefined);
  });

  it("accepts valid hours and counts", () => {
    assert.equal(validateHoursDraft("2"), undefined);
    assert.equal(validateHoursDraft("1.5"), undefined);
    assert.equal(validateCountDraft("7"), undefined);
    assert.equal(parseHoursDraft("2"), 2);
    assert.equal(parseCountDraft("7"), 7);
  });

  it("rejects invalid values", () => {
    assert.equal(validateHoursDraft("0"), "invalid");
    assert.equal(validateHoursDraft("abc"), "invalid");
    assert.equal(validateCountDraft("0"), "invalid");
    assert.equal(validateCountDraft("1.5"), "invalid");
  });

  it("invalidates plan when any row is incomplete", () => {
    const result = validateBlockPlanDrafts([
      { id: "a", hours: "2", count: "" },
      { id: "b", hours: "1", count: "3" },
    ]);
    assert.equal(result.valid, false);
    assert.equal(result.rows[0]?.countError, "empty");
  });
});
