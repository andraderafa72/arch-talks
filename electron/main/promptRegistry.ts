import type { ConversationKind } from "../../src/renderer/types.ts";

export type PromptId =
  | "technical_document.chat"
  | "system_design.onboarding"
  | "system_design.materialize"
  | "system_design.chat"
  | "vault.conversational"
  | "vault.topic_analysis"
  | "vault.batch_extraction"
  | "vault.consumption";

export type PromptSegmentDefinition = {
  id: string;
  label: string;
  dynamic?: boolean;
};

export type PromptCatalogItem = {
  id: PromptId;
  kind: ConversationKind;
  label: string;
  description: string;
  segments: PromptSegmentDefinition[];
};

export const PROMPT_CATALOG: PromptCatalogItem[] = [
  {
    id: "technical_document.chat",
    kind: "technical_document",
    label: "LaTeX chat",
    description: "Main assistant for technical document workspaces.",
    segments: [
      { id: "role", label: "Role" },
      { id: "active_file", label: "Active file", dynamic: true },
      { id: "files_listing", label: "Workspace files", dynamic: true },
      { id: "patch_instructions", label: "Patch instructions" },
      { id: "behavior", label: "Behavior" },
    ],
  },
  {
    id: "system_design.onboarding",
    kind: "system_design",
    label: "System context onboarding",
    description: "Initial assistant that gathers system context before diagrams are generated.",
    segments: [
      { id: "role", label: "Role" },
      { id: "scan_folder_hint", label: "Scan folder hint", dynamic: true },
      { id: "task", label: "Task rules" },
    ],
  },
  {
    id: "system_design.materialize",
    kind: "system_design",
    label: "SYSTEM.md materialization",
    description: "Creates SYSTEM.md and the diagram suggestions backlog.",
    segments: [
      { id: "role", label: "Role" },
      { id: "output_rules", label: "Output rules" },
      { id: "diagram_layout_rules", label: "Diagram layout rules", dynamic: true },
    ],
  },
  {
    id: "system_design.chat",
    kind: "system_design",
    label: "System design chat",
    description: "Main assistant for architecture diagrams and PlantUML edits.",
    segments: [
      { id: "role", label: "Role" },
      { id: "system_md", label: "SYSTEM.md context", dynamic: true },
      { id: "scan_block", label: "Scan folder", dynamic: true },
      { id: "mention_contexts", label: "@ reference contexts", dynamic: true },
      { id: "suggestions", label: "Diagram suggestions", dynamic: true },
      { id: "active_file", label: "Active file", dynamic: true },
      { id: "files_listing", label: "Workspace files", dynamic: true },
      { id: "patch_instructions", label: "Patch instructions" },
      { id: "diagram_rules", label: "Diagram rules" },
    ],
  },
  {
    id: "vault.conversational",
    kind: "vault",
    label: "Vault chat",
    description: "Conversational assistant for exploring and planning vault content.",
    segments: [
      { id: "role", label: "Role" },
      { id: "subject_matter", label: "Subject matter" },
      { id: "category_rules", label: "Category rules", dynamic: true },
      { id: "semantic_skills", label: "Semantic skills", dynamic: true },
      { id: "planning_skills", label: "Planning skills", dynamic: true },
      { id: "structure_rules", label: "Structure rules" },
      { id: "structure_report", label: "Structure report", dynamic: true },
      { id: "file_listing", label: "File listing", dynamic: true },
      { id: "active_file", label: "Active file", dynamic: true },
      { id: "reference_excerpt", label: "Reference excerpt", dynamic: true },
      { id: "behavior", label: "Behavior" },
    ],
  },
  {
    id: "vault.topic_analysis",
    kind: "vault",
    label: "Vault topic analysis",
    description: "Phase 1 of vault ingestion: extracts durable topics.",
    segments: [
      { id: "role", label: "Role" },
      { id: "subject_matter", label: "Subject matter" },
      { id: "category_rules", label: "Category rules", dynamic: true },
      { id: "structure_rules", label: "Structure rules" },
      { id: "behavior", label: "Task behavior" },
      { id: "semantic_skills", label: "Semantic skills", dynamic: true },
      { id: "planning_skills", label: "Planning skills", dynamic: true },
      { id: "structure_report", label: "Structure report", dynamic: true },
      { id: "file_listing", label: "File listing", dynamic: true },
      { id: "output_contract", label: "Output contract" },
      { id: "already_generated_context", label: "Already generated context", dynamic: true },
    ],
  },
  {
    id: "vault.batch_extraction",
    kind: "vault",
    label: "Vault batch extraction",
    description: "Phase 2 of vault ingestion: writes the vault ingestion plan.",
    segments: [
      { id: "role", label: "Role" },
      { id: "subject_matter", label: "Subject matter" },
      { id: "category_rules", label: "Category rules", dynamic: true },
      { id: "structure_rules", label: "Structure rules" },
      { id: "planning_skills", label: "Planning skills", dynamic: true },
      { id: "structure_report", label: "Structure report", dynamic: true },
      { id: "file_listing", label: "File listing", dynamic: true },
      { id: "active_file", label: "Active file", dynamic: true },
      { id: "output_contract", label: "Output contract" },
      { id: "already_generated_context", label: "Already generated context", dynamic: true },
    ],
  },
  {
    id: "vault.consumption",
    kind: "vault",
    label: "Vault consumption",
    description: "Playground assistant that answers from vault notes.",
    segments: [
      { id: "role", label: "Role" },
      { id: "vault_label", label: "Vault label", dynamic: true },
      { id: "applied_skill", label: "Applied skill", dynamic: true },
      { id: "file_listing", label: "File listing", dynamic: true },
      { id: "note_contents", label: "Note contents", dynamic: true },
      { id: "behavior", label: "Behavior" },
    ],
  },
];

export function listPromptCatalog(kind?: ConversationKind): PromptCatalogItem[] {
  return kind ? PROMPT_CATALOG.filter((item) => item.kind === kind) : PROMPT_CATALOG;
}

export function getPromptCatalogItem(promptId: PromptId): PromptCatalogItem {
  const item = PROMPT_CATALOG.find((entry) => entry.id === promptId);
  if (!item) throw new Error(`Unknown prompt id: ${promptId}`);
  return item;
}
