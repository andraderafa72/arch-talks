import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidSystemDesignDiagramPath,
  systemDesignDiagramPath,
} from "./systemDesignDiagramLayout.ts";

test("systemDesignDiagramPath returns flat paths for small layout", () => {
  assert.equal(systemDesignDiagramPath("small", "block"), "diagrams/block.puml");
});

test("systemDesignDiagramPath returns module paths for large layout", () => {
  assert.equal(systemDesignDiagramPath("large", "sequence", "Auth Module"), "diagrams/modules/auth-module/sequence.puml");
});

test("isValidSystemDesignDiagramPath rejects type folders and flow folders", () => {
  assert.equal(isValidSystemDesignDiagramPath("diagrams/activity/billing.puml"), false);
  assert.equal(isValidSystemDesignDiagramPath("diagrams/flows/checkout.puml"), false);
});

test("isValidSystemDesignDiagramPath accepts canonical small and large paths", () => {
  assert.equal(isValidSystemDesignDiagramPath("diagrams/block.puml"), true);
  assert.equal(isValidSystemDesignDiagramPath("diagrams/modules/billing/sequence.puml"), true);
});
