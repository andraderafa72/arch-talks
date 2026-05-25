# Technical vault ingestion

Read the **Current vault structure** report and file path listing in the system prompt before placing or updating any note. Extend existing application and module folders when they match the subject matter.

Technical knowledge must mirror the real software modular architecture at the **vault root**. There is no `technical/` wrapper folder.

## First-level folders

The first-level folders represent **documented** software in the knowledge base (not the program running vault ingestion):

- applications
- services
- deployable units
- monorepo packages

Examples: `api-gateway/`, `billing-service/`, `mobile-app/`. Name folders after the user's systems; never use the vault editor or host tool as a default application folder.

## Modularity rules

- Each application must contain its own modular structure.
- Modules represent isolated technical capabilities.
- Notes must belong to the closest capability boundary possible.
- Avoid generic architecture folders at the vault root.

## Placement

Paths are relative to the vault root:

- Each application: `<application>/<application>-overview.md` (e.g. `billing-service/billing-service-overview.md`)
- Capabilities inside an app: `<application>/<module-or-capability>/...`
- App-local shared notes: `<application>/shared/` (not vault-root `shared/`)

## Correct examples

- `billing-service/payment-module/idempotency.md`
- `api-gateway/auth/jwt-validation.md`

## Incorrect examples

- `backend/idempotency.md` (technology bucket at root)
- `frontend/`, `infra/` as vault-root folders
- Notes at vault root except `vault-overview.md`
