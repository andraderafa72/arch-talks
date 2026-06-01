export type SystemDesignLayoutMode = "small" | "large";

export const SYSTEM_DESIGN_DIAGRAM_TYPES = ["activity", "block", "sequence"] as const;

export type SystemDesignDiagramType = (typeof SYSTEM_DESIGN_DIAGRAM_TYPES)[number];

const DIAGRAM_TYPE_SET = new Set<string>(SYSTEM_DESIGN_DIAGRAM_TYPES);

function slugifySegment(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "system"
  );
}

export function normalizeSystemDesignModuleSlug(value: string): string {
  return slugifySegment(value);
}

export function isSystemDesignDiagramType(value: string): value is SystemDesignDiagramType {
  return DIAGRAM_TYPE_SET.has(value.trim());
}

export function systemDesignDiagramPath(
  mode: SystemDesignLayoutMode,
  diagramType: string,
  moduleSlug?: string,
): string {
  const type = diagramType.trim();
  if (!isSystemDesignDiagramType(type)) {
    throw new Error(`Invalid system design diagram type: ${diagramType}`);
  }
  if (mode === "small") {
    return `diagrams/${type}.puml`;
  }
  const module = normalizeSystemDesignModuleSlug(moduleSlug ?? "");
  return `diagrams/modules/${module}/${type}.puml`;
}

export function isValidSystemDesignDiagramPath(relPath: string): boolean {
  const path = relPath.trim().replace(/\\/g, "/");
  if (/^diagrams\/[^/]+\.puml$/.test(path)) {
    const type = path.slice("diagrams/".length, -".puml".length);
    return isSystemDesignDiagramType(type);
  }
  const largeMatch = path.match(/^diagrams\/modules\/([a-z0-9][a-z0-9-]*)\/([^/]+)\.puml$/);
  if (!largeMatch) return false;
  return isSystemDesignDiagramType(largeMatch[2] ?? "");
}

export function parseSuggestionsLayoutMode(markdown: string): SystemDesignLayoutMode | null {
  const match = markdown.match(/^Layout:\s*(small|large)\s*$/im);
  return match ? (match[1] as SystemDesignLayoutMode) : null;
}

export function formatSystemDesignDiagramLayoutRules(existingPumlPaths: string[]): string {
  const existing = existingPumlPaths.length > 0 ? existingPumlPaths.sort().join("\n") : "(none)";
  return `## Diagram layout rules
- Choose exactly one layout for diagrams/suggestions.md: small or large.
- Small systems use paths directly under diagrams/: diagrams/{type}.puml.
- Large systems use module folders only under diagrams/modules/{module}/: diagrams/modules/{module}/{type}.puml.
- Diagram types are file names, never folders.
- Allowed diagram type files: ${SYSTEM_DESIGN_DIAGRAM_TYPES.map((type) => `${type}.puml`).join(", ")}.
- Never use diagrams/flows/, diagrams/context/, diagrams/data/, diagrams/activity/, diagrams/block/, or diagrams/sequence/ as folders.
- Existing PlantUML files:
${existing}`;
}
