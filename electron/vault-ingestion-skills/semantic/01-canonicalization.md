# Canonicalization

All extracted notes must be rewritten into self-contained canonical form in `vaultIngestionPlan` entry `content`.

## Rules

- Remove conversational phrasing ("we talked about", "as I said").
- Eliminate ambiguity; expand shorthand.
- Remove pronouns when the referent is unclear.
- Avoid references to prior messages or "above/below".
- Preserve meaning while improving retrieval quality.
- Use stable terminology consistent with the vault and reference material.
- Normalize naming conventions (kebab-case paths, Title Case headings).

## Self-contained rule

A `canonical_body` must be understandable without access to the original conversation or chat history.

## Structure

- Use clear markdown headings aligned with the artifact type template.
- Prefer short paragraphs and bullet lists where they aid retrieval.
- Include explicit entities (product names, technologies, limits).
