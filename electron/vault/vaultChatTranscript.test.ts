import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildVaultChatTurnPrompt,
  buildVaultSourceText,
  formatVaultChatTranscript,
  normalizeVaultChatMessages,
} from "./vaultChatTranscript.ts";

test("formatVaultChatTranscript includes user and assistant turns", () => {
  const transcript = formatVaultChatTranscript([
    { role: "user", content: "We use PostgreSQL for billing." },
    { role: "assistant", content: "Noted." },
    { role: "user", content: "Ingest this into the vault." },
  ]);

  assert.match(transcript, /User: We use PostgreSQL/);
  assert.match(transcript, /Assistant: Noted\./);
  assert.match(transcript, /User: Ingest this into the vault\./);
});

test("buildVaultSourceText combines transcript and reference excerpt", () => {
  const source = buildVaultSourceText("User: hello", "ref file content");
  assert.match(source, /User: hello/);
  assert.match(source, /Reference folder excerpt/);
  assert.match(source, /ref file content/);
});

test("buildVaultChatTurnPrompt includes prior turns when session history is missing", () => {
  const prompt = buildVaultChatTurnPrompt("Ingest now", [
    { role: "user", content: "Topic A details" },
    { role: "assistant", content: "Got it." },
    { role: "user", content: "Ingest now" },
  ]);

  assert.match(prompt, /Conversation so far/);
  assert.match(prompt, /Topic A details/);
  assert.match(prompt, /Latest user message/);
  assert.match(prompt, /Ingest now/);
});

test("normalizeVaultChatMessages falls back to latest prompt", () => {
  assert.deepEqual(normalizeVaultChatMessages(undefined, "only prompt"), [
    { role: "user", content: "only prompt" },
  ]);
});
