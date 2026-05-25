# Semantic relationships

Artifacts declare directed semantic relationships in addition to markdown `## Related` wikilinks in the final note.

## Relationship types

- `depends_on` — artifact requires another to be understood or valid
- `extends` — specialization or elaboration of another artifact
- `contradicts` — incompatible with another (document tension explicitly)
- `replaces` — supersedes a prior approach or artifact
- `related_to` — topical association without strict dependency
- `caused_by` — outcome or choice explained by another artifact
- `enables` — makes another approach or capability possible
- `constrained_by` — limited by another artifact (rule, limit, decision)

## Rules

- `target` must be another `artifact_id` or a concrete planned vault path.
- Avoid generic or empty relationships.
- Prefer explicit semantic direction (from current artifact → target).
- Relationships improve retrieval routing and future graph traversal.
- Mirror important relationships as `[[wikilinks]]` in the vault planner phase.
