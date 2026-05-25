import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildAlreadyGeneratedIngestionContext,
  buildVaultIngestionSourceTranscript,
  extractAlreadyIngestedTopicLines,
  isIngestionArtifactMessage,
} from "./vaultIngestionContext.ts";
import type { VaultChatMessage } from "./vaultChatTranscript.ts";

const sampleChat: VaultChatMessage[] = [
  { role: "user", content: "Our billing service uses PostgreSQL." },
  { role: "assistant", content: "Noted." },
  {
    role: "system",
    content:
      "Analysis: 2 topic(s) in 1 batch(es). 2 file(s) ready.\n• Billing database (concept)\n• Payment flow (workflow)",
  },
  { role: "user", content: "We also cache invoices in Redis." },
];

test("isIngestionArtifactMessage detects system ingestion summaries", () => {
  assert.equal(isIngestionArtifactMessage(sampleChat[2]!), true);
  assert.equal(isIngestionArtifactMessage(sampleChat[0]!), false);
});

test("buildVaultIngestionSourceTranscript excludes ingestion artifacts", () => {
  const transcript = buildVaultIngestionSourceTranscript(sampleChat);
  assert.match(transcript, /PostgreSQL/);
  assert.match(transcript, /Redis/);
  assert.doesNotMatch(transcript, /Analysis: 2 topic/);
  assert.doesNotMatch(transcript, /Billing database/);
});

test("buildAlreadyGeneratedIngestionContext lists prior topics", () => {
  const context = buildAlreadyGeneratedIngestionContext(sampleChat);
  assert.match(context, /Already generated in this chat/);
  assert.match(context, /Billing database \(concept\)/);
  assert.match(context, /do not re-ingest/i);
});

test("extractAlreadyIngestedTopicLines parses bullet topics", () => {
  assert.deepEqual(extractAlreadyIngestedTopicLines(sampleChat), [
    "Billing database (concept)",
    "Payment flow (workflow)",
  ]);
});
