import assert from "node:assert/strict";
import test from "node:test";
import { resolveSystemPromptFromSnapshots } from "./resolveSystemPromptCore.ts";
import type { PromptOverrideSnapshot } from "./promptOverridesIo.ts";
import type { PromptId } from "./promptRegistry.ts";

const promptId: PromptId = "technical_document.chat";
const defaultPrompt = "default prompt";
const defaultSegments = {
  role: "default role",
  active_file: "active file",
  files_listing: "files",
  patch_instructions: "patch rules",
  behavior: "default behavior",
};

function emptySnapshot(): PromptOverrideSnapshot {
  return {
    manifest: { version: 1, revision: 1, prompts: {} },
    contents: {},
  };
}

function fullSnapshot(content: string): PromptOverrideSnapshot {
  return {
    manifest: {
      version: 1,
      revision: 1,
      prompts: {
        [promptId]: {
          enabled: true,
          mode: "full",
          file: "technical_document.chat.md",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    },
    contents: { [promptId]: { full: content } },
  };
}

function segmentSnapshot(segments: Record<string, string>): PromptOverrideSnapshot {
  return {
    manifest: {
      version: 1,
      revision: 1,
      prompts: {
        [promptId]: {
          enabled: true,
          mode: "segments",
          segments: Object.fromEntries(
            Object.keys(segments).map((id) => [id, { enabled: true, file: `${id}.md` }]),
          ),
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    },
    contents: { [promptId]: { segments } },
  };
}

test("resolveSystemPromptFromSnapshots returns default without overrides", () => {
  assert.equal(
    resolveSystemPromptFromSnapshots({
      promptId,
      defaultPrompt,
      segments: defaultSegments,
      globalSnapshot: emptySnapshot(),
    }),
    defaultPrompt,
  );
});

test("resolveSystemPromptFromSnapshots applies global segment overrides", () => {
  assert.equal(
    resolveSystemPromptFromSnapshots({
      promptId,
      defaultPrompt,
      segments: defaultSegments,
      globalSnapshot: segmentSnapshot({ role: "global role" }),
    }),
    [
      "global role",
      "active file",
      "files",
      "patch rules",
      "default behavior",
    ].join("\n\n"),
  );
});

test("resolveSystemPromptFromSnapshots applies global full override", () => {
  assert.equal(
    resolveSystemPromptFromSnapshots({
      promptId,
      defaultPrompt,
      segments: defaultSegments,
      globalSnapshot: fullSnapshot("global full"),
    }),
    "global full",
  );
});

test("resolveSystemPromptFromSnapshots lets workspace segments override global segments", () => {
  assert.equal(
    resolveSystemPromptFromSnapshots({
      promptId,
      defaultPrompt,
      segments: defaultSegments,
      globalSnapshot: segmentSnapshot({ role: "global role", behavior: "global behavior" }),
      documentSnapshot: segmentSnapshot({ role: "workspace role" }),
    }),
    [
      "workspace role",
      "active file",
      "files",
      "patch rules",
      "global behavior",
    ].join("\n\n"),
  );
});

test("resolveSystemPromptFromSnapshots lets workspace full override global full", () => {
  assert.equal(
    resolveSystemPromptFromSnapshots({
      promptId,
      defaultPrompt,
      segments: defaultSegments,
      globalSnapshot: fullSnapshot("global full"),
      documentSnapshot: fullSnapshot("workspace full"),
    }),
    "workspace full",
  );
});

test("resolveSystemPromptFromSnapshots keeps global full above workspace segments", () => {
  assert.equal(
    resolveSystemPromptFromSnapshots({
      promptId,
      defaultPrompt,
      segments: defaultSegments,
      globalSnapshot: fullSnapshot("global full"),
      documentSnapshot: segmentSnapshot({ role: "workspace role" }),
    }),
    "global full",
  );
});
