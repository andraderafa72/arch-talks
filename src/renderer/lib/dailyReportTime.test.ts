import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  activeTrackerElapsedMs,
  elapsedMsToHours,
  formatElapsedDuration,
  formatHoursLabel,
  formatQuarterHours,
  MIN_TRACKED_HOURS,
  parseDurationInputToMs,
  roundUpToQuarterHours,
} from "./dailyReportTime.ts";

describe("dailyReportTime", () => {
  it("converts elapsed interval to hours with 2 decimal rounding", () => {
    const start = "2026-05-25T10:00:00.000Z";
    const end = "2026-05-25T11:30:00.000Z";
    assert.equal(elapsedMsToHours(start, end), 1.5);
  });

  it("enforces minimum tracked hours", () => {
    const start = "2026-05-25T10:00:00.000Z";
    const end = "2026-05-25T10:00:10.000Z";
    assert.equal(elapsedMsToHours(start, end), MIN_TRACKED_HOURS);
  });

  it("formats elapsed duration as HH:MM:SS or MM:SS", () => {
    assert.equal(formatElapsedDuration(90_000), "1:30");
    assert.equal(formatElapsedDuration(3_661_000), "1:01:01");
  });

  it("rounds hours up to 15-minute blocks for summary", () => {
    assert.equal(roundUpToQuarterHours(0.01), 0.25);
    assert.equal(roundUpToQuarterHours(0.25), 0.25);
    assert.equal(roundUpToQuarterHours(0.26), 0.5);
    assert.equal(roundUpToQuarterHours(1), 1);
    assert.equal(roundUpToQuarterHours(1.01), 1.25);
  });

  it("computes active tracker elapsed with pause accumulation", () => {
    const tracker = {
      startedAt: "2026-05-25T10:00:00.000Z",
      accumulatedMs: 60_000,
      paused: true,
    };
    assert.equal(activeTrackerElapsedMs(tracker, Date.parse("2026-05-25T10:05:00.000Z")), 60_000);
    assert.equal(
      activeTrackerElapsedMs({ ...tracker, paused: false }, Date.parse("2026-05-25T10:01:00.000Z")),
      120_000,
    );
  });

  it("parses duration input strings", () => {
    assert.equal(parseDurationInputToMs("1:30"), 90_000);
    assert.equal(parseDurationInputToMs("1:05:30"), 3_930_000);
    assert.equal(parseDurationInputToMs(""), null);
  });

  it("formats quarter-hour blocks as human-readable durations", () => {
    assert.equal(formatQuarterHours(0.25), "15m");
    assert.equal(formatQuarterHours(0.5), "30m");
    assert.equal(formatQuarterHours(1), "1h");
    assert.equal(formatQuarterHours(1.25), "1h 15m");
  });

  it("formats hours as Xh YYm labels", () => {
    assert.equal(formatHoursLabel(0.25), "0h 15m");
    assert.equal(formatHoursLabel(1.5), "1h 30m");
    assert.equal(formatHoursLabel(2.083), "2h 05m");
  });
});
