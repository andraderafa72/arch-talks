# Overview files

Overview files match `*-overview.md` (glob). The host and structure report treat any path ending in `-overview.md` (and legacy `overview.md`) as a folder overview.

## Naming

| Location | Filename | Example |
|----------|----------|---------|
| Vault root | `vault-overview.md` | `vault-overview.md` |
| Subfolder | `<last-folder-segment>-overview.md` | `billing/billing-overview.md`, `cache/concepts/concepts-overview.md` |

Each folder and **every subfolder** that receives notes must have **exactly one** overview file used for navigation and retrieval routing.

- **New folders:** always create `<segment>-overview.md`, never bare `overview.md`.
- **Existing vaults:** if the structure report lists `overview.md` in a folder, **update that path**; do not rename unless the user asks.

## Quick context preview

Every overview (including subfolder overviews) must open with a short routing blurb so retrieval can scan without reading the full note:

```markdown
# Billing Overview

> Quick context: Invoice rules, payment retries, and dunning policies for the billing domain.

## Context
...
```

Use one `>` blockquote line (or a `## Quick context` section) with 1–2 sentences: what the folder contains and when to use it.

## Standard sections

- `# <Area> Overview`
- Quick context preview (blockquote or `## Quick context`)
- `## Context`
- `## Core standards` (or equivalent)
- `## Why this matters`
- `## Where to go deeper` (wikilinks to child notes)
- `## Retrieval guidance`
- `## Related`

When adding notes to a folder, include that folder's `*-overview.md` in `creates` (if missing) or `updates` (if it exists) with links to new notes.

## Phase 2 file count

`files_total_count` on `vaultIngestionPlan` is the total number of create/update entries — **topic notes plus overview files**. It is **not** the topic count from phase 1. Count every file before emitting YAML; the host validates `creates.length + updates.length === files_total_count`.
