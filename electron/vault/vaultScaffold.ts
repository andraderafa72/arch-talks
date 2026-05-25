import type { VaultCategory } from "./archConfig.ts";

const OVERVIEW_BY_CATEGORY: Record<VaultCategory, string> = {
  business: `# Vault Overview

> Quick context: Business knowledge by domain and capability at the vault root.

## Context
Business knowledge vault — organize by domain and capability at the vault root (e.g. \`billing/\`, \`logistics/\`).

## Core standards
Module-first: every note belongs to a business capability folder, not generic catch-alls.

## Why this matters

## Where to go deeper

## Retrieval guidance
Use domain overviews and capability folders for routing.

## Related
`,
  technical: `# Vault Overview

> Quick context: Technical knowledge by application or service at the vault root.

## Context
Technical knowledge vault — first-level folders are applications or services (e.g. \`billing-service/\`, \`api-gateway/\`).

## Core standards
Mirror modular software architecture; avoid technology buckets like \`backend/\` or \`frontend/\` at the root.

## Why this matters

## Where to go deeper

## Retrieval guidance
Route by application, then module or capability subfolders.

## Related
`,
  project: `# Vault Overview

> Quick context: Project knowledge linking business rules, technical decisions, and implementation mappings.

## Context
Project vault — first-level folders are projects (e.g. \`organize-app/\`). Each project capability links business rules, technical decisions, and implementation mappings.

## Core standards
Use \`implementation-mappings/\` to connect business intent, technical execution, and operational behavior.

## Why this matters

## Where to go deeper

## Retrieval guidance
Start from project overview, then capability; prefer implementation-mapping notes for cross-layer questions.

## Related
`,
};

export function buildVaultScaffold(category: VaultCategory): Record<string, string> {
  return {
    "vault-overview.md": OVERVIEW_BY_CATEGORY[category],
  };
}
