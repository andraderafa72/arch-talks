import assert from "node:assert/strict";
import { test } from "node:test";
import { getKnownBuiltInThemeIds, normalizeUiThemeId } from "./normalizeUiThemeId.ts";

test("getKnownBuiltInThemeIds includes bundled preset ids", () => {
  const ids = getKnownBuiltInThemeIds();
  assert.ok(ids.includes("default"));
  assert.ok(ids.includes("nord"));
  assert.ok(ids.includes("solarized"));
  assert.ok(ids.includes("orange"));
});

test("getKnownBuiltInThemeIds rejects custom slug overlap", () => {
  const ids = getKnownBuiltInThemeIds();
  assert.equal(ids.includes("my-custom-theme"), false);
  assert.equal(ids.includes("default"), true);
});

test("normalizeUiThemeId preserves custom slug before themes load", () => {
  assert.equal(normalizeUiThemeId("my-custom-theme", []), "my-custom-theme");
});

test("normalizeUiThemeId falls back when custom theme missing after load", () => {
  assert.equal(normalizeUiThemeId("missing-theme", [{ id: "other", name: "Other" } as never]), "default");
});
