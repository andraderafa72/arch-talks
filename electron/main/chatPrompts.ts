import { formatBlockPlanForPrompt } from "../daily-report/dailyReportBlockPlan.ts";
import type { DailyReportBlockSpec, DailyReportTaxonomy } from "../daily-report/dailyReportTypes.ts";

const PATCH_YAML_INSTRUCTIONS = (activeFile: string) => `When you want to propose edits to a file, include a YAML code block with the following structure:

\`\`\`yaml
patch:
  file: ${activeFile}
  changes:
    - type: replace_all
      content: |
        <full new content>
\`\`\`

Available change types:
- \`replace_all\`: Replace the entire file content
- \`replace_block\`: Replace a specific block; requires \`target\` and \`content\`
- \`insert_after\`: Insert content after an anchor text; requires \`anchor\` and \`content\`
- \`insert_before\`: Insert content before an anchor text; requires \`anchor\` and \`content\`

Use \`|\` block scalars for multiline \`content\`.
If no file change is needed, respond with plain text only, without any YAML block.
When you include a patch, use exactly one \`\`\`yaml code block with the full patch — do not repeat the same YAML later in the message, and do not paste raw YAML outside the fence.`;

export function buildWorkspaceChatSystemPrompt(activeFile: string, files: Record<string, string>): string {
  const fileEntries = Object.entries(files)
    .map(([name, content]) => `### ${name}\n\`\`\`\n${content}\n\`\`\``)
    .join("\n\n");
  return `You are a helpful technical document editing assistant. The user is editing a document workspace.

Active file: ${activeFile}

Files in the workspace:
${fileEntries}

${PATCH_YAML_INSTRUCTIONS(activeFile)}
Keep responses concise and focused.`;
}

export function buildSystemContextOnboardingPrompt(scanFolderPath?: string): string {
  const scanBlock = scanFolderPath?.trim()
    ? `\n## Codebase to explore\nThe user's existing system lives at: \`${scanFolderPath.trim()}\`\nExplore relevant source, configuration, and documentation on disk to infer architecture. Ask clarifying questions about anything ambiguous.\n`
    : "";

  return `You are a system design context assistant. Your job is to help the user define a software system before they create architecture diagrams.

${scanBlock}
## Your task
- Ask structured questions about: purpose, actors, external systems, core capabilities, data flows, constraints, tech stack, scale, and non-goals.
- Extract as much durable context as possible from the user's answers${scanFolderPath ? " and the codebase" : ""}.
- Do not emit PlantUML, YAML patches, or file edits during this phase.
- When the user signals they are done, summarize everything gathered in clear prose (sections: Overview, Actors, External systems, Capabilities, Data, Flows, Constraints, Technology, Open questions).
- Keep replies concise; prefer one focused question at a time when context is missing.`;
}

export function buildSystemMdMaterializationPrompt(): string {
  return `You are a system design document writer. Synthesize the conversation into a single SYSTEM.md file.

Output **only** markdown (no code fences wrapping the whole document). Use this structure:

# System: {name}
## Overview
## Actors & users
## External systems
## Core capabilities
## Data & persistence
## Key flows
## Constraints & NFRs
## Technology
## Open questions

Fill every section from the conversation. Use bullet lists where helpful. Do not invent major facts not supported by the conversation.`;
}

export function buildSystemDesignChatSystemPrompt(options: {
  activeFile: string;
  files: Record<string, string>;
  systemMd: string;
  scanFolderPath?: string;
  mentionContexts?: { label: string; excerpt: string }[];
}): string {
  const fileEntries = Object.entries(options.files)
    .filter(([name]) => name !== "SYSTEM.md" || name === options.activeFile)
    .map(([name, content]) => `### ${name}\n\`\`\`\n${content}\n\`\`\``)
    .join("\n\n");

  const scanBlock = options.scanFolderPath?.trim()
    ? `\n## Agent scan folder\nThe system codebase is at: \`${options.scanFolderPath.trim()}\`. You may reference it when proposing diagrams.\n`
    : "";

  const mentionBlock =
    options.mentionContexts && options.mentionContexts.length > 0
      ? `\n## Referenced context\n${options.mentionContexts.map((c) => `### ${c.label}\n${c.excerpt}`).join("\n\n")}\n`
      : "";

  return `You are a system design and PlantUML diagram assistant. The user is modeling a system with architecture diagrams.

## System context (authoritative)
${options.systemMd.trim() || "(SYSTEM.md is empty — align with user messages)"}
${scanBlock}${mentionBlock}
Active diagram file: ${options.activeFile}

Workspace files:
${fileEntries || "(no other files)"}

${PATCH_YAML_INSTRUCTIONS(options.activeFile)}

Output valid PlantUML when proposing full files (e.g. @startuml … @enduml).
Keep diagrams aligned with SYSTEM.md. Keep responses concise and focused.`;
}

export function buildMarkdownChatSystemPrompt(activeFile: string, fileContent: string): string {
  return `You are a helpful markdown editing assistant. The user is editing a markdown document.

Active file: ${activeFile}

Current file content:
\`\`\`markdown
${fileContent}
\`\`\`

${PATCH_YAML_INSTRUCTIONS(activeFile)}
Keep responses concise and focused.`;
}

export function buildUmlChatSystemPrompt(activeFile: string, fileContent: string): string {
  return `You are a helpful PlantUML diagram assistant. The user is editing UML / PlantUML source.

Active file: ${activeFile}

Current diagram source:
\`\`\`plantuml
${fileContent}
\`\`\`

${PATCH_YAML_INSTRUCTIONS(activeFile)}

Output valid PlantUML when proposing full files (e.g. @startuml … @enduml, or other supported diagram types).
Keep responses concise and focused.`;
}

const VAULT_SUBJECT_MATTER = `## Subject matter (critical)
- Extract and plan knowledge only for the domain the user describes in their messages and optional reference material.
- Do not assume user input refers to the vault editor, ingestion chat, host application, or any tool that runs this session unless the user names it explicitly.
- In a technical vault, first-level "application" folders document named software systems in the user's knowledge base — not the program hosting this chat.
- Existing vault notes are context about what is already stored; do not treat them as the topic of the current message unless the user's text clearly matches that topic.`;

function vaultCategoryBlock(category: "business" | "technical" | "project"): string {
  return `## Vault category (immutable)
This vault is a **${category}** vault. The vault root is the user directory on disk.
All paths are relative to that root. Do not add a category prefix folder (no business/, technical/, or projects/ wrapper).
Follow the category skill for first-level folder semantics and placement.`;
}

const VAULT_STRUCTURE_RULES = `## Current vault structure (mandatory context)
- **Read** the structure report and vault file paths below before every decision.
- **Reuse** existing folders and naming patterns; do not invent parallel folder trees for the same domain.
- **Prefer** \`updates\` for paths that already exist; use \`creates\` only for new paths.
- **Respect** per-folder note limits and overview requirements (see planning skills).
- **Align** new paths with \`vault_hint\` from topic analysis and with the category placement rules.
- When a folder has an overview file (\`*-overview.md\` or legacy \`overview.md\`), plan an \`updates\` entry for that overview when adding child notes (wikilinks in \`## Where to go deeper\`; refresh the quick context preview).
- **Every subfolder** that receives new topic notes must have a \`<folder-segment>-overview.md\` (create if missing, update if present). New overviews must include a quick context preview (blockquote or \`## Quick context\`).
- **Skip** knowledge already ingested in this chat or already present in the vault unless the user explicitly asks to revise it.`;

function appendAlreadyGeneratedContext(base: string, alreadyGeneratedContext?: string): string {
  const extra = alreadyGeneratedContext?.trim();
  if (!extra) return base;
  return `${base}\n\n${extra}`;
}

export function buildTopicAnalysisSystemPrompt(options: {
  category: "business" | "technical" | "project";
  semanticSkills: string;
  planningSkills: string;
  structureReport: string;
  files: Record<string, string>;
  alreadyGeneratedContext?: string;
}): string {
  const fileListing = Object.keys(options.files).sort().join("\n") || "(empty vault)";
  return appendAlreadyGeneratedContext(
    `You are a knowledge vault topic analyst (phase 1 of ingestion).

${VAULT_SUBJECT_MATTER}

${vaultCategoryBlock(options.category)}

${VAULT_STRUCTURE_RULES}

## Your task
Enumerate every independently extractable durable topic in the source text. One topic = one future vault note.
Do not write note bodies or full vault paths.
For each topic, set \`vault_hint\` to the **existing folder** where the note should live (from the structure report), or a new folder path segment that fits current layout.

${options.semanticSkills}

${options.planningSkills}

## Current vault structure (report)
${options.structureReport}

## Vault file paths (complete listing)
${fileListing}

## Output (mandatory)
Respond with **exactly one** \`\`\`yaml fenced block containing \`topicAnalysis\` only.
No conversational text before or after the fence.
See semantic/05-yaml-output-contract.md for the schema.`,
    options.alreadyGeneratedContext,
  );
}

export function buildTopicAnalysisPrompt(options: {
  userPrompt: string;
  sourceText: string;
  structureReport: string;
  alreadyGeneratedContext?: string;
}): string {
  return appendAlreadyGeneratedContext(
    `## Latest user message
${options.userPrompt}

## Conversation and source text (full)
${options.sourceText}

## Reminder — current vault structure
Review the structure report and file paths in the system prompt before listing topics.
Set each topic's \`vault_hint\` to match an existing folder when the knowledge belongs there; avoid duplicate topics for notes that already exist.
Extract only topics not already covered by prior ingestion in this chat or by existing vault files.

${options.structureReport}

Emit topicAnalysis YAML listing all durable topics that still need extraction.`,
    options.alreadyGeneratedContext,
  );
}

export function buildBatchExtractionSystemPrompt(options: {
  category: "business" | "technical" | "project";
  planningSkills: string;
  structureReport: string;
  activeFile: string;
  files: Record<string, string>;
  alreadyGeneratedContext?: string;
}): string {
  const fileListing = Object.keys(options.files).sort().join("\n") || "(empty vault)";
  const activeSnippet = options.files[options.activeFile]
    ? `### ${options.activeFile}\n\`\`\`\n${options.files[options.activeFile]}\n\`\`\``
    : "(active file empty or missing)";

  return appendAlreadyGeneratedContext(
    `You are a knowledge vault file writer (phase 2 extraction).

${VAULT_SUBJECT_MATTER}

${vaultCategoryBlock(options.category)}

${VAULT_STRUCTURE_RULES}

${options.planningSkills}

## Current vault structure (report)
${options.structureReport}

## Vault file paths (complete listing)
${fileListing}

## Active file
${activeSnippet}

## Output (mandatory)
Respond with **exactly one** \`\`\`yaml fenced block containing \`vaultIngestionPlan\` only.
No conversational text before or after the fence.
Cover **every** topic from the assigned topic table in this single response.
Set \`batch_index: 1\` and \`batch_total: 1\` on the plan.
Declare \`files_total_count\` — the exact number of create/update entries you emit (topic notes **plus** folder overview files). The host validates entry count against this field; it is **not** the same as topic count.
Every subfolder that receives new notes must include an overview file entry (\`<segment>-overview.md\` create or update; see shared/05-overview-files.md).
Overview updates count as separate entries when required.
Use \`|\` block scalars for multiline \`content\`.
Do not put YAML frontmatter inside \`content\` — the host adds confidence and keywords.
See semantic/05-yaml-output-contract.md.`,
    options.alreadyGeneratedContext,
  );
}

export function buildBatchExtractionPrompt(options: {
  userPrompt: string;
  sourceText: string;
  structureReport: string;
  batchTopics: { id: string; title: string; type: string; source_anchor?: string; vault_hint?: string }[];
  analysisSummary: string;
  alreadyGeneratedContext?: string;
}): string {
  const topicTable = options.batchTopics
    .map(
      (t) =>
        `| ${t.id} | ${t.title} | ${t.type} | ${t.vault_hint ?? ""} | ${t.source_anchor ?? ""} |`,
    )
    .join("\n");

  return appendAlreadyGeneratedContext(
    `## vaultIngestionPlan (single response)
Analysis summary: ${options.analysisSummary}

Extract vault notes for **all** topics below in one \`vaultIngestionPlan\` YAML block.
Set \`batch_index: 1\` and \`batch_total: 1\`.

Before emitting YAML, count every file you will create or update:
- one topic note per row in the table (\`topic_id\` required on those entries)
- one \`<segment>-overview.md\` (create or update) for **each subfolder** that receives new topic notes, each with a quick context preview

Set \`files_total_count\` to that total. The number of \`creates\` + \`updates\` entries must equal \`files_total_count\`. This total is **not** the topic count.

| id | title | type | vault_hint | source_anchor |
|----|-------|------|------------|---------------|
${topicTable}

## Latest user message
${options.userPrompt}

## Conversation and source text (full)
${options.sourceText}

## Reminder — current vault structure
Use paths under existing folders from the system prompt structure report. Put entries in \`updates\` when the path already exists; use \`creates\` for new paths only. Every subfolder with new notes must have a \`*-overview.md\` entry (prefer \`<segment>-overview.md\`; update legacy \`overview.md\` if that is what exists).
Do not recreate files or topics already generated in prior ingestion runs unless the user asked to revise them.

${options.structureReport}

Emit vaultIngestionPlan YAML with \`files_total_count\` matching the number of create/update entries.
Cover every topic in the table with a topic note entry. Overview-only entries omit \`topic_id\`.`,
    options.alreadyGeneratedContext,
  );
}

export function buildVaultConversationalPrompt(options: {
  category: "business" | "technical" | "project";
  semanticSkills: string;
  planningSkills: string;
  structureReport: string;
  activeFile: string;
  files: Record<string, string>;
  referenceExcerpt?: string;
}): string {
  const fileListing = Object.keys(options.files).sort().join("\n") || "(empty vault)";
  const activeSnippet = options.files[options.activeFile]
    ? `### ${options.activeFile}\n\`\`\`\n${options.files[options.activeFile]}\n\`\`\``
    : "(active file empty or missing)";

  const referenceBlock = options.referenceExcerpt
    ? `\n## Reference folder excerpt\n${options.referenceExcerpt}\n`
    : "";

  return `You are a knowledge vault assistant. Help the user explore and plan vault content.

${VAULT_SUBJECT_MATTER}

${vaultCategoryBlock(options.category)}

${options.semanticSkills}

${options.planningSkills}

${VAULT_STRUCTURE_RULES}

## Current vault structure (report)
${options.structureReport}

## Vault file paths (complete listing)
${fileListing}

## Active file
${activeSnippet}
${referenceBlock}
## Behavior
- Use chat to gather context and clarify ambiguous input.
- Do not emit topicAnalysis or vaultIngestionPlan YAML unless the user explicitly asks to ingest or import knowledge into the vault.
- Do not use patch format. Do not claim files were written.
- Keep replies concise and focused.`;
}

/** @deprecated use buildTopicAnalysisSystemPrompt / buildBatchExtractionSystemPrompt */
export function buildVaultIngestionPrompt(options: {
  category: "business" | "technical" | "project";
  semanticSkills: string;
  planningSkills: string;
  structureReport: string;
  activeFile: string;
  files: Record<string, string>;
  referenceExcerpt?: string;
}): string {
  return buildVaultConversationalPrompt(options);
}

const VAULT_CONSUMPTION_SNIPPET_MAX = 4_000;
const VAULT_CONSUMPTION_MAX_FILES = 40;

function truncateForPrompt(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n… (truncated)`;
}

export function buildVaultConsumptionPrompt(options: {
  skillContent: string;
  skillName: string;
  vaultName?: string;
  activeFile: string;
  files: Record<string, string>;
}): string {
  const paths = Object.keys(options.files).sort();
  const fileListing = paths.length > 0 ? paths.join("\n") : "(empty vault)";

  const prioritized = [...paths].sort((a, b) => {
    if (a === options.activeFile) return -1;
    if (b === options.activeFile) return 1;
    return a.localeCompare(b);
  });

  const bodyPaths = prioritized.slice(0, VAULT_CONSUMPTION_MAX_FILES);
  const fileBodies = bodyPaths
    .map((rel) => {
      const content = options.files[rel] ?? "";
      const limit = rel === options.activeFile ? VAULT_CONSUMPTION_SNIPPET_MAX : Math.min(2_000, VAULT_CONSUMPTION_SNIPPET_MAX);
      return `### ${rel}\n\`\`\`markdown\n${truncateForPrompt(content, limit)}\n\`\`\``;
    })
    .join("\n\n");

  const vaultLabel = options.vaultName?.trim() ? `Vault: ${options.vaultName.trim()}` : "Knowledge vault";

  return `You are a vault consumption assistant. You help the user explore, search, and understand notes in an Obsidian-style knowledge vault using a local model.

${vaultLabel}
Active file: ${options.activeFile || "(none)"}

## Applied skill — ${options.skillName}

${options.skillContent}

## Vault note paths
${fileListing}

## Note contents
${fileBodies || "(no readable notes)"}

## Behavior
- Answer from vault content only. Do not invent paths or note text.
- When citing notes, use vault-relative paths (e.g. \`folder/note.md\`) so the user can open them.
- Prefer markdown lists with **bold paths** for search results, per the skill format.
- Do not emit ingestion YAML, vault plans, or file patches — plain conversational markdown only.
- Keep answers focused and cite the most relevant notes.`;
}

export function buildDailyReportSystemPrompt(options: {
  date: string;
  taxonomy: DailyReportTaxonomy;
  taskBlockPlan?: DailyReportBlockSpec[];
}): string {
  const categoriesJson = JSON.stringify(
    options.taxonomy.categories.map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description ?? null,
    })),
    null,
    2,
  );
  const taskTypesJson = JSON.stringify(
    options.taxonomy.taskTypes.map((t) => ({
      id: t.id,
      category_id: t.categoryId,
      label: t.label,
      description: t.description ?? null,
    })),
    null,
    2,
  );

  const blockPlanSection = formatBlockPlanForPrompt(options.taskBlockPlan ?? []);
  const hasBlockPlan = blockPlanSection.length > 0;

  const blockPlanRules = hasBlockPlan
    ? `
## RULES WHEN A TASK BLOCK PLAN IS ACTIVE (HIGHEST PRIORITY)
- The TASK BLOCK PLAN section above is **law**. It overrides this rules list, the conversation, and any saved tasks.
- **IGNORE** previously registered tasks for entry count and hours. You may reuse wording and taxonomy only.
- Output **exactly** the entry count and **exact** per-entry hours multiset defined in the plan — nothing else.
`
    : "";

  return `You are a daily work report assistant. The user describes what they did on a given day; you help structure it into time-tracked task entries.

## Report date
${options.date}
${blockPlanSection}
## Allowed categories (use category_id exactly as listed)
\`\`\`json
${categoriesJson}
\`\`\`

## Allowed task types (use task_type_id exactly; each belongs to one category via category_id)
\`\`\`json
${taskTypesJson}
\`\`\`

## Rules
- Extract every distinct work block the user mentions; assign category_id and task_type_id from the lists above only.
${blockPlanRules}- When **no** block plan is active, use realistic hours (decimals allowed, e.g. 1.5).
- If the user's activity does not fit well, pick the closest valid type.
- You may add a short narrative overview of the day.
- Respond with brief conversational text first, then **exactly one** fenced YAML block with root key \`dailyReportSummary\`.

## Output (mandatory YAML schema)
\`\`\`yaml
dailyReportSummary:
  narrative: "Optional one-paragraph day overview"
  entries:
    - hours: 2.5
      description: "What was done"
      category_id: <id from categories list>
      task_type_id: <id from task types list>
\`\`\`

Include at least one entry when the user described work. Use snake_case keys category_id and task_type_id in YAML.`;
}
