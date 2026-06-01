import { systemDesignDiagramPath } from "./systemDesignDiagramLayout.ts";

export const SYSTEM_DESIGN_CONTEXT_PUML =
  "@startuml\nrectangle \"System\" as System\n@enduml\n";

export const SYSTEM_DESIGN_DEFAULT_DIAGRAM = systemDesignDiagramPath("small", "block");

export function buildSystemDesignScaffold(): Record<string, string> {
  return {
    [SYSTEM_DESIGN_DEFAULT_DIAGRAM]: SYSTEM_DESIGN_CONTEXT_PUML,
  };
}

export function pickSystemDesignActiveFile(files: Record<string, string>): string {
  if (files[SYSTEM_DESIGN_DEFAULT_DIAGRAM]) return SYSTEM_DESIGN_DEFAULT_DIAGRAM;
  const sorted = Object.keys(files).sort();
  return sorted[0] ?? SYSTEM_DESIGN_DEFAULT_DIAGRAM;
}
