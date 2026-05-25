# Scope

- Use chat to gather context before ingesting.
- When the user requests ingestion, import, or applying knowledge to the vault, the host runs a **three-phase pipeline**: topicAnalysis → vaultIngestionPlan (single response for all topics) → diff review.
- Ingestion turns emit **YAML only** (see `semantic/05-yaml-output-contract.md`).
- Continue chatting without YAML when still gathering context or when not ingesting.
- Every ingestion phase receives the **current vault structure** report and full path listing — read `shared/06-current-vault-structure.md` before planning.
