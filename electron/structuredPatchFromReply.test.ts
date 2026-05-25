import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractPatchAndSpans,
  partitionChatReply,
  stripSpansFromText,
  tryParseMinimalPatch,
} from "./structuredPatchFromReply.ts";

const ACTIVE = "notes/readme.md";

describe("structuredPatchFromReply", () => {
  it("parses replace_all from yaml fence with multiline content", () => {
    const reply = `Here is the updated file.

\`\`\`yaml
patch:
  file: ${ACTIVE}
  changes:
    - type: replace_all
      content: |
        line one
        line two
\`\`\``;
    const { reply: clean, patch } = partitionChatReply(reply, ACTIVE);
    assert.ok(patch);
    assert.equal(patch!.file, ACTIVE);
    assert.equal(patch!.changes.length, 1);
    assert.equal(patch!.changes[0]!.type, "replace_all");
    assert.equal((patch!.changes[0] as { content: string }).content, "line one\nline two\n");
    assert.ok(!clean.includes("```yaml"));
    assert.match(clean, /updated file/);
  });

  it("parses insert_after from yaml fence", () => {
    const reply = `\`\`\`yml
patch:
  changes:
    - type: insert_after
      anchor: "## Intro"
      content: |
        New paragraph.
\`\`\``;
    const { patch } = partitionChatReply(reply, ACTIVE);
    assert.ok(patch);
    assert.equal(patch!.file, ACTIVE);
    const ch = patch!.changes[0]!;
    assert.equal(ch.type, "insert_after");
    if (ch.type === "insert_after") {
      assert.equal(ch.anchor, "## Intro");
      assert.equal(ch.content, "New paragraph.\n");
    }
  });

  it("parses replace_block from yaml fence", () => {
    const reply = `\`\`\`yaml
patch:
  file: other.md
  changes:
    - type: replace_block
      target: old text
      content: new text
\`\`\``;
    const { patch } = partitionChatReply(reply, ACTIVE);
    assert.ok(patch);
    assert.equal(patch!.file, "other.md");
    const ch = patch!.changes[0]!;
    assert.equal(ch.type, "replace_block");
    if (ch.type === "replace_block") {
      assert.equal(ch.target, "old text");
      assert.equal(ch.content, "new text");
    }
  });

  it("returns no patch for invalid yaml", () => {
    const reply = `\`\`\`yaml
patch:
  changes: not-an-array
\`\`\``;
    const { patch } = partitionChatReply(reply, ACTIVE);
    assert.equal(patch, undefined);
  });

  it("stripSpansFromText removes fenced blocks", () => {
    const text = "before\n```yaml\npatch:\n  changes: []\n```\nafter";
    const spans = [{ start: text.indexOf("```yaml"), end: text.indexOf("```", text.indexOf("```yaml") + 3) + 3 }];
    const out = stripSpansFromText(text, spans);
    assert.equal(out.trim(), "before\n\nafter");
  });

  it("falls back to legacy json fence", () => {
    const reply = `\`\`\`json
{
  "patch": {
    "file": "${ACTIVE}",
    "changes": [
      { "type": "replace_all", "content": "legacy body" }
    ]
  }
}
\`\`\``;
    const { patch, reply: clean } = partitionChatReply(reply, ACTIVE);
    assert.ok(patch);
    assert.equal((patch!.changes[0] as { content: string }).content, "legacy body");
    assert.ok(!clean.includes("```json"));
  });

  it("extractPatchAndSpans merges overlapping yaml spans", () => {
    const text = "text\n```yaml\npatch:\n  changes:\n    - type: replace_all\n      content: x\n```";
    const result = extractPatchAndSpans(text, ACTIVE);
    assert.ok(result);
    assert.equal(result!.patch.changes[0]!.type, "replace_all");
  });

  it("tryParseMinimalPatch accepts wrapped patch object", () => {
    const patch = tryParseMinimalPatch(
      {
        patch: {
          file: "a.md",
          changes: [{ type: "replace_all", content: "hi" }],
        },
      },
      ACTIVE,
    );
    assert.ok(patch);
    assert.equal(patch!.file, "a.md");
  });
});
