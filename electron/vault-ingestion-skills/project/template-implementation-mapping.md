# Template: implementation mapping

Use for notes under `<project>/<capability>/implementation-mappings/`.

```markdown
# Title

## Business intent
What the business requires. Link to business-rules notes:
- [[project/capability/business-rules/related-rule]]

## Technical implementation
How the system enforces it. Link to technical-decisions notes:
- [[project/capability/technical-decisions/related-decision]]

## Affected modules
- Module or service names
- API surfaces
- Workers or async flows

## Operational behavior
- HTTP status codes, error shapes
- Retries, idempotency, edge cases
- User-visible outcomes

## Related
- [[path/to/business-rule]]
- [[path/to/technical-decision]]
```

Every section must have explicit content. Cross-layer mapping notes must link at least one business-rules note and one technical-decisions note.
