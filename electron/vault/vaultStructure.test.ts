import assert from "node:assert/strict";
import { test } from "node:test";
import {
  folderOverviewBasename,
  isOverviewPath,
  preferredOverviewPathForFolder,
} from "./vaultStructure.ts";

test("isOverviewPath matches *-overview.md and legacy overview.md", () => {
  assert.equal(isOverviewPath("billing/billing-overview.md"), true);
  assert.equal(isOverviewPath("cache/concepts/concepts-overview.md"), true);
  assert.equal(isOverviewPath("billing/overview.md"), true);
  assert.equal(isOverviewPath("vault-overview.md"), true);
  assert.equal(isOverviewPath("billing/rules/invoice.md"), false);
});

test("preferredOverviewPathForFolder uses last folder segment", () => {
  assert.equal(preferredOverviewPathForFolder("(root)"), "vault-overview.md");
  assert.equal(preferredOverviewPathForFolder("billing"), "billing/billing-overview.md");
  assert.equal(preferredOverviewPathForFolder("cache/concepts"), "cache/concepts/concepts-overview.md");
  assert.equal(folderOverviewBasename("billing"), "billing-overview.md");
});
