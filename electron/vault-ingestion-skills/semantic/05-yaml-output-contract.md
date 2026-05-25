# YAML output contract (three-phase ingestion)

The host runs ingestion in three phases. Each model turn emits **exactly one** ` ```yaml ` block with **no conversational text** outside the fence.

## Phase 1 — topicAnalysis

Enumerate topics only. No note bodies or full vault paths.
Read **Current vault structure** and **Vault file paths** in the system prompt first.

```yaml
topicAnalysis:
  summary: Short description of the source material
  total_count: 20
  topics:
    - id: redis-cache-strategy
      title: Redis caching under write contention
      type: concept
      source_anchor: "## Write path caching"
      vault_hint: cache/concepts
```

- `id` — stable kebab-case, unique in the analysis
- `type` — concept, rule, decision, pattern, workflow, entity, glossary, incident, constraint, heuristic, mapping, overview, anti_pattern
- `source_anchor` — heading or short quote locating the topic in the source text
- `vault_hint` — existing folder from the structure report, or a new segment that fits the current tree

## Phase 2 — vaultIngestionPlan (single response for all topics)

Write file content for **every** topic in the assigned topic table in one response.
Include **one overview file** (`<folder-segment>-overview.md` create or update; match `*-overview.md`) for each subfolder that receives new topic notes. Each overview must include a **quick context preview** (blockquote or `## Quick context`).
Paths must align with **Current vault structure**, each topic's `vault_hint`, and placement skills. Use `updates` for existing paths; `creates` for new paths only.

```yaml
vaultIngestionPlan:
  batch_index: 1
  batch_total: 1
  files_total_count: 9
  summary: Extraction for all analyzed topics (7 topic notes + 2 folder overviews)
  creates:
    - path: cache/concepts/redis-strategy.md
      topic_id: redis-cache-strategy
      title: Redis caching under write contention
      type: concept
      confidence: high
      keywords:
        - redis
        - cache
      relationships:
        - type: depends_on
          target: postgresql-lock-contention.md
      content: |
        # Redis caching under write contention

        Self-contained markdown. No YAML frontmatter in content.
    - path: cache/concepts/concepts-overview.md
      content: |
        # Concepts Overview

        > Quick context: Caching patterns and storage strategies for this capability.

        ## Context

        ## Where to go deeper
        - [[redis-strategy]]
  updates: []
```

- `files_total_count` — **required**; exact count of all `creates` + `updates` entries (topic notes and overview files)
- `topic_id` — required on topic note entries; omit on overview-only entries
- `batch_index` and `batch_total` are always `1`
- Use `|` block scalars for multiline `content`
- `relationships[].target` — topic id from the topic table, existing vault path, or another topic id from the analysis

## Persisted note frontmatter (host-added)

The host adds minimal frontmatter when writing files:

```yaml
---
confidence: high
keywords:
  - term-one
---
```

Do not put frontmatter inside `content`. Relationships become `## Related` wikilinks.

## Rules

- One ` ```yaml ` fence per turn; no prose outside the fence on ingestion turns
- Casual vault chat (no ingestion) — plain text only, no YAML
