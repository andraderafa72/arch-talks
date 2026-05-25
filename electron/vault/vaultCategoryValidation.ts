import type { VaultCategory } from "./archConfig.ts";
import { normalizeVaultPath } from "./applyVaultIngestionPlan.ts";
import type { VaultIngestionPlan } from "./vaultTypes.ts";
import type { ValidationResult } from "./vaultStructure.ts";

const ROOT_OVERVIEW = "vault-overview.md";

const BUSINESS_CATCH_ALL = /^(misc|general|other|temp|tmp)(-|$)/i;
const TECH_ROOT_BUCKETS = new Set(["backend", "frontend", "infra", "infrastructure", "devops", "shared"]);
const PROJECT_ARCH_FOLDER = /^[^/]+\/architecture(\/|$)/i;

function pathSegments(rel: string): string[] {
  return normalizeVaultPath(rel).split("/").filter(Boolean);
}

function isRootAllowedFile(path: string): boolean {
  const norm = normalizeVaultPath(path);
  return norm === ROOT_OVERVIEW;
}

function validateMappingNoteContent(path: string, content: string): string[] {
  const errors: string[] = [];
  if (!path.includes("/implementation-mappings/")) return errors;

  const requiredSections = ["## Business intent", "## Technical implementation", "## Operational behavior"];
  for (const section of requiredSections) {
    if (!content.includes(section)) {
      errors.push(`Mapping note "${path}" must include section "${section}".`);
    }
  }

  const hasBusinessLink =
    /\[\[[^\]]*business-rules[^\]]*\]\]/i.test(content) ||
    /business-rules\//i.test(content);
  const hasTechnicalLink =
    /\[\[[^\]]*technical-decisions[^\]]*\]\]/i.test(content) ||
    /technical-decisions\//i.test(content);

  if (!hasBusinessLink) {
    errors.push(`Mapping note "${path}" must link to at least one business-rules note.`);
  }
  if (!hasTechnicalLink) {
    errors.push(`Mapping note "${path}" must link to at least one technical-decisions note.`);
  }

  return errors;
}

function validatePathForCategory(path: string, category: VaultCategory): string[] {
  const errors: string[] = [];
  const norm = normalizeVaultPath(path);
  const segments = pathSegments(norm);

  if (segments.length === 0) {
    errors.push("Plan entry has empty path.");
    return errors;
  }

  if (segments.length === 1) {
    if (!isRootAllowedFile(norm) && !norm.endsWith("/overview.md")) {
      errors.push(
        `Path "${norm}" must not be a lone file at vault root (except vault-overview.md or domain/app overviews in subfolders).`,
      );
    }
    return errors;
  }

  const first = segments[0]!.toLowerCase();

  if (category === "business") {
    if (BUSINESS_CATCH_ALL.test(first)) {
      errors.push(`Business vault: reject catch-all domain folder "${segments[0]}".`);
    }
    if (first === "shared" && segments.length === 2 && !segments[1]!.endsWith(".md")) {
      /* shared/ subdirs ok */
    }
  }

  if (category === "technical") {
    if (TECH_ROOT_BUCKETS.has(first)) {
      errors.push(
        `Technical vault: "${segments[0]}" is a technology bucket at vault root; use an application or service folder instead.`,
      );
    }
  }

  if (category === "project") {
    if (PROJECT_ARCH_FOLDER.test(norm)) {
      errors.push(`Project vault: reject centralized architecture folder at "${norm}".`);
    }
    const isMappingPath = norm.includes("/implementation-mappings/");
    const looksLikeMapping =
      /mapping/i.test(segments.at(-1) ?? "") ||
      norm.includes("implementation-mapping");
    if (looksLikeMapping && !isMappingPath) {
      errors.push(
        `Project vault: cross-layer mapping notes must live under implementation-mappings/ (got "${norm}").`,
      );
    }
  }

  return errors;
}

export function validateVaultIngestionPlanByCategory(
  plan: VaultIngestionPlan,
  category: VaultCategory,
): ValidationResult {
  const errors: string[] = [];

  for (const entry of [...plan.creates, ...plan.updates]) {
    errors.push(...validatePathForCategory(entry.path, category));
    if (category === "project") {
      errors.push(...validateMappingNoteContent(entry.path, entry.content));
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true };
}
