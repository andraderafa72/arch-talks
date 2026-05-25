import yaml from "js-yaml";

export function extractYamlBlocks(text: string): string[] {
  const blocks: string[] = [];
  const fenceRe = /```ya?ml\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(text)) !== null) {
    blocks.push(m[1] ?? "");
  }
  return blocks;
}

export function extractJsonBlocks(text: string): string[] {
  const blocks: string[] = [];
  const fenceRe = /```json\s*([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(text)) !== null) {
    blocks.push(m[1] ?? "");
  }
  return blocks;
}

/** YAML fences first, then JSON (legacy fallback). */
export function extractStructuredBlocks(text: string): string[] {
  return [...extractYamlBlocks(text), ...extractJsonBlocks(text)];
}

export function parseStructuredDocument(inner: string): unknown | undefined {
  const trimmed = inner.trim();
  if (!trimmed) return undefined;
  try {
    const fromYaml = yaml.load(trimmed);
    if (fromYaml !== undefined && fromYaml !== null) return fromYaml;
  } catch {
    /* try JSON */
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return undefined;
  }
}

export function findBalancedObjectEnd(s: string, start: number): number | undefined {
  if (s[start] !== "{") return undefined;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (inStr) {
      if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return undefined;
}

export function extractYamlObjectByKey(reply: string, key: string): unknown | undefined {
  const probe = new RegExp(`(?:^|\\n)${key}\\s*:`, "m");
  const match = probe.exec(reply);
  if (!match) return undefined;
  const start = match.index + (match[0].startsWith("\n") ? 1 : 0);
  try {
    const loaded = yaml.load(reply.slice(start));
    if (loaded !== undefined && loaded !== null) return loaded;
  } catch {
    /* continue */
  }
  return undefined;
}

export function extractJsonObjectByKey(reply: string, key: string): unknown | undefined {
  const probe = new RegExp(`\\{[\\s\\r\\n]*"${key}"\\s*:`, "g");
  let match: RegExpExecArray | null;
  while ((match = probe.exec(reply)) !== null) {
    const start = match.index;
    const end = findBalancedObjectEnd(reply, start);
    if (end == null) continue;
    try {
      return JSON.parse(reply.slice(start, end)) as unknown;
    } catch {
      /* continue */
    }
  }
  return undefined;
}

export function extractStructuredObjectByKey(reply: string, key: string): unknown | undefined {
  return extractYamlObjectByKey(reply, key) ?? extractJsonObjectByKey(reply, key);
}
