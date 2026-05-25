import assert from "node:assert/strict";
import { test } from "node:test";
import { inferSystemToneFromContent, resolveSystemTone } from "./chatSystemMessage.ts";
import type { ChatMessage } from "@/types";

test("inferSystemToneFromContent classifies errors", () => {
  assert.equal(inferSystemToneFromContent("Ingestion errors:\n• bad path"), "error");
  assert.equal(inferSystemToneFromContent("Failed to write files to disk: ENOENT"), "error");
});

test("inferSystemToneFromContent classifies warnings", () => {
  assert.equal(inferSystemToneFromContent("Validation warnings:\n• note"), "warning");
  assert.equal(inferSystemToneFromContent("Generation stopped."), "warning");
});

test("inferSystemToneFromContent defaults to info for status messages", () => {
  assert.equal(
    inferSystemToneFromContent("Files written to disk (2 new, 1 update). Review the diff."),
    "info",
  );
  assert.equal(inferSystemToneFromContent("Analysis: 5 topic(s) analyzed."), "info");
});

test("resolveSystemTone prefers explicit systemTone", () => {
  const message: ChatMessage = {
    id: "1",
    role: "system",
    content: "Ingestion errors: x",
    systemTone: "info",
    timestamp: new Date().toISOString(),
  };
  assert.equal(resolveSystemTone(message), "info");
});
