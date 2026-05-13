const MAX_FILE_BYTES = 512 * 1024;
const MAX_JOB_BYTES = 2 * 1024 * 1024;

export type SanitizeFilesResult =
  | { ok: true; files: Record<string, string> }
  | { ok: false; error: string };

function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

/** Normalize newlines, strip BOM, reject NUL; enforce UTF-8 and size limits. */
export function sanitizeInput(text: string, label = "document"): string {
  if (text.includes("\0")) {
    throw new Error(`${label}: null bytes are not allowed`);
  }
  const buf = Buffer.from(text, "utf8");
  const roundTrip = buf.toString("utf8");
  if (roundTrip !== stripBom(text)) {
    throw new Error(`${label}: invalid UTF-8`);
  }
  let out = stripBom(roundTrip);
  out = out.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (Buffer.byteLength(out, "utf8") > MAX_FILE_BYTES) {
    throw new Error(`${label}: exceeds ${MAX_FILE_BYTES} bytes`);
  }
  return out;
}

/** Validate relative keys and sanitize every string value. */
export function sanitizeLatexFiles(files: Record<string, string>): SanitizeFilesResult {
  if (!files || typeof files !== "object" || Array.isArray(files)) {
    return { ok: false, error: "files must be a non-array object" };
  }
  const keys = Object.keys(files);
  if (keys.length === 0) {
    return { ok: false, error: "files must not be empty" };
  }
  let total = 0;
  const out: Record<string, string> = {};
  for (const rawKey of keys) {
    const key = rawKey.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!key || key.includes("..") || key.startsWith("/")) {
      return { ok: false, error: `invalid path key: ${rawKey}` };
    }
    for (let i = 0; i < key.length; i++) {
      const c = key.charCodeAt(i);
      if (c <= 31) {
        return { ok: false, error: `invalid path key: ${rawKey}` };
      }
    }
    const val = files[rawKey];
    if (typeof val !== "string") {
      return { ok: false, error: `invalid content for ${rawKey}` };
    }
    try {
      const sanitized = sanitizeInput(val, rawKey);
      out[key] = sanitized;
      total += Buffer.byteLength(sanitized, "utf8");
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  if (total > MAX_JOB_BYTES) {
    return { ok: false, error: `job exceeds ${MAX_JOB_BYTES} bytes total` };
  }
  return { ok: true, files: out };
}
