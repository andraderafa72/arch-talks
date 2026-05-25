# Knowledge filtering

Apply after extraction, before vault planning.

## Transit vs durable

| Transit (do not persist) | Durable (persist) |
|--------------------------|-------------------|
| "let's maybe try X later" | Adopted architecture choice |
| Brainstorming without decision | Recorded decision with rationale |
| One-off debugging narrative | Reusable incident or constraint |
| Opinions without operational impact | Normative rules (`must` / `must not`) |

## Metadata durability

Assign each artifact:

- `ephemeral` — context-only; must **not** appear in `vaultIngestionPlan`
- `stable` — normal vault note
- `foundational` — core reference; prefer prominent placement and strong cross-links

## Deduplication

- Merge duplicate ideas into one artifact with highest confidence.
- Record near-duplicates in `topicAnalysis.summary` when uncertain; do not duplicate topics.
