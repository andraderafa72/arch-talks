import assert from "node:assert/strict";
import { test } from "node:test";
import { INTEGRATION_IDS } from "../../shared/integrations.ts";
import { INTEGRATION_CATALOG, getCatalogEntry } from "./catalog.ts";

test("integration catalog covers all integration ids", () => {
  for (const id of INTEGRATION_IDS) {
    const entry = getCatalogEntry(id);
    assert.ok(entry, `missing catalog entry for ${id}`);
    assert.equal(entry.id, id);
    assert.ok(entry.startCommandArgv.length >= 2);
    assert.equal(entry.startCommandArgv[0], "docker");
    assert.ok(entry.startCommandDisplay.length > 0);
  }
});

test("plentymarkets cannot execute until image is configured", () => {
  assert.equal(INTEGRATION_CATALOG.plentymarkets.canExecute, false);
});
