# Vault search

Search and retrieve information from a knowledge vault during chat and RAG consumption.

## When to use

- The user asks a question that should be answered from vault notes.
- You need to locate relevant markdown files before quoting or summarizing.
- The user mentions finding, looking up, or searching vault content.

## Search strategy

1. Match note titles and paths against the user query.
2. Scan note bodies for keywords, synonyms, and related wikilink targets.
3. Prefer notes with strong wikilink connectivity to the topic.
4. Rank results by relevance, recency when available, and overview/index notes.

## Response rules

- Return up to **5** relevant notes with vault-relative paths.
- Include a **one-line summary** per note.
- Quote a short excerpt only when it directly supports the answer.
- If nothing matches, say so clearly and suggest broader or alternate terms.
- Do not invent note paths or content that is not in the vault.

## Output format

```markdown
### Results

1. **path/to/note.md** — one-line summary
   > optional excerpt

2. ...
```
