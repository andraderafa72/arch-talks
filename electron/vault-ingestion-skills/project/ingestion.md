# Project vault ingestion

Read the **Current vault structure** report and file path listing in the system prompt before placing or updating any note. Extend existing project and capability folders when they match the subject matter.

Project vaults contain contextualized implementation knowledge at the **vault root**. There is no `projects/` wrapper folder.

A project vault connects business rules, technical definitions, and operational implementation for **one or more named projects**.

## First-level folders

Each first-level folder is a **project** (e.g. `organize-app/`, `another-project/`).

## Modularity rules

Inside a project:

- Subfolders represent project capabilities or bounded contexts (e.g. `billing/`, `logistics/`).
- Each capability owns its own implementation knowledge.
- Avoid centralized `<project>/architecture/` folders.

## Knowledge distribution

Paths are relative to the vault root:

- Business understanding: `<project>/<capability>/business-rules/`
- Technical implementation: `<project>/<capability>/technical-decisions/`
- Execution mapping: `<project>/<capability>/implementation-mappings/`
- Operational flows: `<project>/<capability>/workflows/`
- Limits: `<project>/<capability>/constraints/`
- Each project and capability should have `<segment>-overview.md` (e.g. `organize-app/organize-app-overview.md`, `organize-app/billing/billing-overview.md`).

## Implementation mapping rule

Cross-layer notes belong only under `implementation-mappings/`. They must explicitly connect:

- business intent
- technical implementation
- operational consequences

Use artifact type `mapping` in semantic IR for these notes.

Link to sibling notes via `[[wikilinks]]` and semantic `relationships`.

## Correct examples

- `organize-app/billing/business-rules/invoice-immutability.md`
- `organize-app/billing/technical-decisions/invoice-aggregate-states.md`
- `organize-app/billing/implementation-mappings/invoice-immutability-api-enforcement.md`

## Incorrect examples

- `organize-app/architecture/architecture-overview.md`
- Mapping content outside `implementation-mappings/`
- Notes at vault root except `vault-overview.md`
