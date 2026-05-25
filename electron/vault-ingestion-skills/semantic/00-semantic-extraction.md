# Semantic extraction

Before generating vault plans, extract durable semantic artifacts from the conversation (and optional reference folder).

## Subject-matter isolation

- Attribute statements only to the systems, domains, and projects the user actually describes.
- Do not map user knowledge to the ingestion host, chat UI, or vault tool unless explicitly named.
- Words like "application", "product", and "system" in user text refer to their subject matter, not this session.

## Extraction rules

- Ignore conversational filler, greetings, and rhetorical language.
- Ignore emotional expressions unless operationally relevant.
- Extract only durable knowledge with future retrieval value.
- Convert implicit references into explicit statements.
- Rewrite content into canonical form (see canonicalization skill).
- Preserve technical precision.
- Avoid contextual coupling to the chat thread.

## What is an idea?

An **idea** is a single independently queryable unit of knowledge: one concept, one decision, one rule, one constraint, one workflow, or one definitional entry.

## Atomicity rules (phase 1 topicAnalysis)

Each topic in `topicAnalysis.topics` must be exactly one independently understandable idea.

Split into separate artifacts when:

- multiple tradeoffs exist
- multiple decisions exist
- multiple concepts can evolve independently
- implementation detail and rationale diverge
- business and technical concerns diverge

**Power rule:** If two sections can be independently queried, they must become separate artifacts.

## Persistence rules (extraction stage)

Do not extract as artifacts:

- temporary intentions
- casual preferences without operational impact
- ephemeral discussion
- repeated statements (deduplicate)
- conversational scaffolding

Do extract:

- architecture decisions
- rules and constraints
- technical tradeoffs
- workflows and operational knowledge
- domain concepts
- reusable insights

## Embedding quality

Notes must optimize for embedding quality: concrete nouns, stable terminology, explicit relationships, no vague pronouns.
