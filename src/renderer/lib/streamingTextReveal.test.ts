import assert from "node:assert/strict";
import { test } from "node:test";
import { computeNextRevealIndex } from "./streamingTextReveal.ts";

test("computeNextRevealIndex returns current when already at target", () => {
  assert.equal(computeNextRevealIndex(10, 10, 100), 10);
});

test("computeNextRevealIndex returns current when elapsed is zero", () => {
  assert.equal(computeNextRevealIndex(0, 50, 0), 0);
});

test("computeNextRevealIndex reveals at least one character per tick", () => {
  assert.equal(computeNextRevealIndex(0, 100, 1), 1);
});

test("computeNextRevealIndex advances roughly at base rate for small backlog", () => {
  const next = computeNextRevealIndex(0, 10, 100);
  assert.equal(next, 4);
});

test("computeNextRevealIndex scales up for large backlog", () => {
  const small = computeNextRevealIndex(0, 10, 100);
  const large = computeNextRevealIndex(0, 500, 100);
  assert.ok(large > small);
});

test("computeNextRevealIndex never exceeds target length", () => {
  assert.equal(computeNextRevealIndex(98, 100, 1000), 100);
  assert.equal(computeNextRevealIndex(0, 5, 10_000), 5);
});
