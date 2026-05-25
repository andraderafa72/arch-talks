# Business vault ingestion

Read the **Current vault structure** report and file path listing in the system prompt before placing or updating any note. Extend existing domain folders when they match the subject matter.

Business knowledge must be organized by bounded business capability at the **vault root** (the user-chosen directory). There is no `business/` wrapper folder.

## Modularity rules

- Every business domain must have its own first-level folder (e.g. `billing/`, `logistics/`, `customer-management/`).
- Rules from different business capabilities must never share the same module folder.
- Prefer operational boundaries over organizational boundaries.
- Folders represent durable business capabilities.

## Placement

Paths are relative to the vault root:

- Rules: `<domain>/rules/`
- Operational flows: `<domain>/workflows/`
- Policies: `<domain>/policies/`
- Constraints: `<domain>/constraints/`
- Terminology: `<domain>/glossary/`
- Each domain must have `<domain>/<domain>-overview.md` (e.g. `billing/billing-overview.md`).

## Correct examples

- `billing/rules/invoice-validation.md`
- `logistics/workflows/shipment-cancellation.md`

## Incorrect examples

- `misc-rules.md` or `general-processes.md` at vault root
- `billing/misc/rule.md` (catch-all subfolders)
- Notes placed directly at vault root except `vault-overview.md`

## Optional shared reference

- `shared/` at vault root is allowed only for cross-domain reference material, not for dumping unrelated rules.
