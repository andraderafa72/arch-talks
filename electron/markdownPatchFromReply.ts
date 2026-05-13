/** Patch shape returned to the renderer (matches IPC / types). */

export type MinimalPatchChange =
  | { type: "insert_after"; anchor: string; content: string }
  | { type: "insert_before"; anchor: string; content: string }
  | { type: "replace_block"; target: string; content: string }
  | { type: "replace_all"; content: string };

export type MinimalPatch = { file: string; changes: MinimalPatchChange[] };

export type TextSpan = { start: number; end: number };

const VALID_CHANGE_TYPES = new Set(["insert_after", "insert_before", "replace_block", "replace_all"]);

const RAW_PATCH_PROBE = /\{[\s\r\n]*"patch"\s*:/g;

const MAX_RAW_BRACE_ATTEMPTS = 48;

/** Find end index (exclusive) of a JSON object starting at `start`, respecting strings. */
function findBalancedObjectEnd(s: string, start: number): number | undefined {
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

export function tryParseMinimalPatch(parsed: unknown, activeFile: string): MinimalPatch | undefined {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
  const obj = parsed as Record<string, unknown>;
  const rawPatch = "patch" in obj ? obj.patch : parsed;
  if (!rawPatch || typeof rawPatch !== "object" || Array.isArray(rawPatch)) return undefined;
  const p = rawPatch as Record<string, unknown>;
  const file = typeof p.file === "string" && p.file.trim() ? p.file.trim() : activeFile;
  if (!Array.isArray(p.changes)) return undefined;
  const changes: MinimalPatchChange[] = [];
  for (const c of p.changes) {
    if (!c || typeof c !== "object") continue;
    const ch = c as Record<string, unknown>;
    if (typeof ch.type !== "string" || !VALID_CHANGE_TYPES.has(ch.type)) continue;
    if (ch.type === "replace_all" && typeof ch.content === "string") {
      changes.push({ type: "replace_all", content: ch.content });
    } else if (
      (ch.type === "insert_after" || ch.type === "insert_before") &&
      typeof ch.anchor === "string" &&
      typeof ch.content === "string"
    ) {
      changes.push({ type: ch.type, anchor: ch.anchor, content: ch.content });
    } else if (
      ch.type === "replace_block" &&
      typeof ch.target === "string" &&
      typeof ch.content === "string"
    ) {
      changes.push({ type: "replace_block", target: ch.target, content: ch.content });
    }
  }
  if (changes.length === 0) return undefined;
  return { file, changes };
}

function parsePatchFromJsonString(inner: string, activeFile: string): MinimalPatch | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(inner.trim());
  } catch {
    return undefined;
  }
  return tryParseMinimalPatch(parsed, activeFile);
}

/** Collect spans of every ```json ... ``` fence in `text`. */
function allJsonFenceSpans(text: string): TextSpan[] {
  const re = /```json\s*([\s\S]*?)```/g;
  const spans: TextSpan[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    spans.push({ start: m.index, end: m.index + m[0].length });
  }
  return spans;
}

function patchFromJsonFences(text: string, activeFile: string): MinimalPatch | undefined {
  const re = /```json\s*([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const patch = parsePatchFromJsonString(m[1] ?? "", activeFile);
    if (patch) return patch;
  }
  return undefined;
}

const SKIP_FENCE_TAGS = new Set(["markdown", "md", "text", "plaintext", "tex", "latex", "uml", "plantuml", "puml"]);

/** Fenced blocks: ```optionalTag ... ``` — try JSON with "patch" when tag is not a known non-JSON language. */
function patchFromGenericFence(
  text: string,
  activeFile: string,
): { patch: MinimalPatch; span: TextSpan } | undefined {
  const re = /```([^\n]*)\s*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const tag = (m[1] ?? "").trim().toLowerCase();
    if (tag === "json") continue;
    if (SKIP_FENCE_TAGS.has(tag)) continue;
    const body = (m[2] ?? "").trim();
    if (!body.startsWith("{") || !body.includes('"patch"')) continue;
    const patch = parsePatchFromJsonString(body, activeFile);
    if (patch) return { patch, span: { start: m.index, end: m.index + m[0].length } };
  }
  return undefined;
}

function patchFromRawObject(text: string, activeFile: string): { patch: MinimalPatch; span: TextSpan } | undefined {
  let attempts = 0;
  RAW_PATCH_PROBE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RAW_PATCH_PROBE.exec(text)) !== null) {
    if (attempts++ >= MAX_RAW_BRACE_ATTEMPTS) break;
    const start = m.index;
    const end = findBalancedObjectEnd(text, start);
    if (end == null) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text.slice(start, end));
    } catch {
      continue;
    }
    const patch = tryParseMinimalPatch(parsed, activeFile);
    if (patch) return { patch, span: { start, end } };
  }
  return undefined;
}

export function stripSpansFromText(text: string, spans: TextSpan[]): string {
  if (spans.length === 0) return text;
  const sorted = [...spans].sort((a, b) => b.start - a.start);
  let out = text;
  for (const { start, end } of sorted) {
    if (start < 0 || end > out.length || start >= end) continue;
    out = out.slice(0, start) + out.slice(end);
  }
  return out;
}

/** Try every strategy; strip all ```json fences when any strategy yields a patch, plus raw span when used. */
export function extractPatchAndSpans(text: string, activeFile: string): { patch: MinimalPatch; spans: TextSpan[] } | undefined {
  const spans: TextSpan[] = [];

  const fromFence = patchFromJsonFences(text, activeFile);
  if (fromFence) {
    spans.push(...allJsonFenceSpans(text));
    return { patch: fromFence, spans: mergeOverlappingSpans(spans) };
  }

  const fromGeneric = patchFromGenericFence(text, activeFile);
  if (fromGeneric) {
    spans.push(...allJsonFenceSpans(text), fromGeneric.span);
    return { patch: fromGeneric.patch, spans: mergeOverlappingSpans(spans) };
  }

  const raw = patchFromRawObject(text, activeFile);
  if (raw) {
    spans.push(...allJsonFenceSpans(text), raw.span);
    return { patch: raw.patch, spans: mergeOverlappingSpans(spans) };
  }

  return undefined;
}

function mergeOverlappingSpans(spans: TextSpan[]): TextSpan[] {
  if (spans.length <= 1) return spans;
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const out: TextSpan[] = [];
  let cur = sorted[0]!;
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]!;
    if (next.start <= cur.end) {
      cur = { start: cur.start, end: Math.max(cur.end, next.end) };
    } else {
      out.push(cur);
      cur = next;
    }
  }
  out.push(cur);
  return out;
}

export function partitionChatReply(reply: string, activeFile: string): { reply: string; patch?: MinimalPatch } {
  const extracted = extractPatchAndSpans(reply, activeFile);
  if (!extracted) {
    return { reply: reply.trim() };
  }
  const cleaned = stripSpansFromText(reply, extracted.spans).replace(/\n{3,}/g, "\n\n").trim();
  return { reply: cleaned || reply.trim(), patch: extracted.patch };
}
