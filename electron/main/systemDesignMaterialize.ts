import {
  isValidSystemDesignDiagramPath,
  parseSuggestionsLayoutMode,
} from "../systemDesign/systemDesignDiagramLayout.ts";

export const MATERIALIZE_FILE_MARKERS = {
  systemMd: "--- FILE: SYSTEM.md ---",
  suggestionsMd: "--- FILE: diagrams/suggestions.md ---",
} as const;

export type MaterializedSystemDesignFiles = {
  systemMd: string;
  suggestionsMd: string;
};

function stripMarkdownFence(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  return match ? match[1]!.trim() : trimmed;
}

export function splitMaterializeReply(raw: string): MaterializedSystemDesignFiles {
  const text = raw.trim();
  const systemMarker = MATERIALIZE_FILE_MARKERS.systemMd;
  const suggestionsMarker = MATERIALIZE_FILE_MARKERS.suggestionsMd;
  const systemIndex = text.indexOf(systemMarker);
  const suggestionsIndex = text.indexOf(suggestionsMarker);

  if (systemIndex !== 0) {
    throw new Error("AI response must start with the SYSTEM.md file marker.");
  }
  if (suggestionsIndex < 0 || suggestionsIndex <= systemIndex) {
    throw new Error("AI response must include diagrams/suggestions.md after SYSTEM.md.");
  }

  return {
    systemMd: text.slice(systemMarker.length, suggestionsIndex).trim(),
    suggestionsMd: text.slice(suggestionsIndex + suggestionsMarker.length).trim(),
  };
}

export function parseAndValidateSystemMd(raw: string): string {
  const content = stripMarkdownFence(raw);
  const start = content.search(/^# System:\s+\S/im);
  if (start < 0) {
    throw new Error("Generated SYSTEM.md is missing the '# System:' heading.");
  }
  const systemMd = content.slice(start).trim();
  if (!/^# System:\s+\S/im.test(systemMd)) {
    throw new Error("Generated SYSTEM.md must start with '# System:'.");
  }
  const requiredSections = ["Overview", "Modules"];
  for (const section of requiredSections) {
    if (!new RegExp(`^##\\s+${section}\\b`, "im").test(systemMd)) {
      throw new Error(`Generated SYSTEM.md is missing the '${section}' section.`);
    }
  }
  const sectionCount = (systemMd.match(/^##\s+/gm) ?? []).length;
  if (sectionCount < 6 || systemMd.length < 300) {
    throw new Error("Generated SYSTEM.md is too short to be a complete system document.");
  }
  return systemMd;
}

function extractSuggestionDiagramPaths(markdown: string): string[] {
  const paths: string[] = [];
  let currentSection = "";
  for (const line of markdown.split(/\r?\n/)) {
    const sectionMatch = line.match(/^##\s+(diagrams(?:\/modules\/[a-z0-9][a-z0-9-]*)?\/?)\s*$/i);
    if (sectionMatch) {
      currentSection = sectionMatch[1]!.replace(/\/?$/, "/");
      continue;
    }
    const fileMatches = [...line.matchAll(/\b([a-z][a-z0-9-]*\.puml)\b/gi)];
    for (const match of fileMatches) {
      if (!currentSection) continue;
      paths.push(`${currentSection}${match[1]}`);
    }
  }
  return paths;
}

export function parseAndValidateSuggestionsMd(raw: string): string {
  const suggestionsMd = stripMarkdownFence(raw);
  if (!/^# Diagram suggestions\s*$/im.test(suggestionsMd)) {
    throw new Error("Generated suggestions.md is missing the '# Diagram suggestions' heading.");
  }
  if (/@startuml/i.test(suggestionsMd)) {
    throw new Error("Generated suggestions.md must not contain PlantUML source.");
  }
  const layout = parseSuggestionsLayoutMode(suggestionsMd);
  if (!layout) {
    throw new Error("Generated suggestions.md must declare 'Layout: small' or 'Layout: large'.");
  }

  const invalidSection = suggestionsMd
    .split(/\r?\n/)
    .map((line) => line.match(/^##\s+(diagrams\/[^ ]*)/i)?.[1])
    .find((section) => {
      if (!section) return false;
      if (layout === "small") return section !== "diagrams/" && section !== "diagrams";
      return !/^diagrams\/modules\/[a-z0-9][a-z0-9-]*\/?$/.test(section);
    });
  if (invalidSection) {
    throw new Error(`Generated suggestions.md uses invalid diagram section '${invalidSection}'.`);
  }

  const paths = extractSuggestionDiagramPaths(suggestionsMd);
  if (paths.length === 0) {
    throw new Error("Generated suggestions.md must list at least one .puml diagram path.");
  }
  const invalidPath = paths.find((path) => !isValidSystemDesignDiagramPath(path));
  if (invalidPath) {
    throw new Error(`Generated suggestions.md contains invalid diagram path '${invalidPath}'.`);
  }
  if (layout === "small" && paths.some((path) => path.startsWith("diagrams/modules/"))) {
    throw new Error("Generated suggestions.md declared small layout but listed module paths.");
  }
  if (layout === "large" && paths.some((path) => /^diagrams\/[^/]+\.puml$/.test(path))) {
    throw new Error("Generated suggestions.md declared large layout but listed flat diagram paths.");
  }
  return suggestionsMd.trim();
}

export function parseAndValidateMaterializedSystemDesign(raw: string): MaterializedSystemDesignFiles {
  const split = splitMaterializeReply(raw);
  return {
    systemMd: parseAndValidateSystemMd(split.systemMd),
    suggestionsMd: parseAndValidateSuggestionsMd(split.suggestionsMd),
  };
}
