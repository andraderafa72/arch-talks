# Current vault structure

The system prompt includes a **Current vault structure** report and a **Vault file paths** listing. These reflect the vault **as it exists now** in the editor — not a template or empty layout.

## You must read them

Before topic analysis, path choice, or batch extraction:

1. Read the structure report (folders, note counts, `*-overview.md` paths, existing paths per folder).
2. Read the complete file path listing.
3. Apply category placement rules from the planning skills.

## Phase 1 — topicAnalysis

- Set `vault_hint` to an **existing folder** from the report when the topic belongs there.
- Do not list topics that duplicate an existing note unless the user asked to revise that note (phase 2 will use `updates`).
- Prefer extending the current tree over creating new top-level folders.

## Phase 2 — vaultIngestionPlan

- **creates** — only for paths that do not appear in the file listing.
- **updates** — for paths that already exist (including `*-overview.md` or legacy `overview.md` when adding child notes).
- Place new notes under folders that already exist when `vault_hint` and placement rules agree.
- Respect folder note limits; use subfolders when a folder is near capacity (see `shared/04-folder-capacity.md`).
- When adding notes to a folder with an overview, include an `updates` entry for that overview with wikilinks to new notes and an updated quick context preview.
- **New** subfolder overviews: `<last-segment>-overview.md` (e.g. `billing/billing-overview.md`), not bare `overview.md`.

## Wrong behavior

- Ignoring the structure report and inventing a parallel folder hierarchy.
- Creating `app-name/foo.md` when `existing-app/foo.md` already exists for the same subject.
- Adding notes to a folder without updating its overview when one exists.
