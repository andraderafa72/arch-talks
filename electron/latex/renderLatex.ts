import fs from "node:fs/promises";
import path from "node:path";
import { app } from "electron";
import type { LatexRenderRequest, LatexRenderResult } from "./types.ts";
import { LatexPdfCache } from "./latexCache.ts";
import { expectedPdfPath, runTectonicInDocker } from "./runTectonicDocker.ts";
import { sanitizeLatexFiles } from "./sanitizeInput.ts";
import { validateLatex } from "./validateLatex.ts";

const STDERR_CAP = 32 * 1024;

let cacheSingleton: LatexPdfCache | null = null;

function getCache(): LatexPdfCache {
  if (!cacheSingleton) {
    cacheSingleton = new LatexPdfCache(path.join(app.getPath("userData"), "latex-cache"));
  }
  return cacheSingleton;
}

function truncateStderr(s: string): string {
  if (s.length <= STDERR_CAP) {
    return s;
  }
  return `${s.slice(0, STDERR_CAP)}…`;
}

function normalizePayload(req: LatexRenderRequest): {
  mainFile: string;
  files: Record<string, string>;
  format: "pdf" | "svg";
  timeoutMs: number;
} {
  let files = req.files ?? {};
  if (typeof req.content === "string" && req.content.length > 0 && Object.keys(files).length === 0) {
    files = { "main.tex": req.content };
  }
  const mainFile = (req.mainFile ?? "main.tex").replace(/\\/g, "/").replace(/^\/+/, "");
  const format = req.format ?? "pdf";
  const timeoutMs = Math.min(Math.max(req.timeoutMs ?? 10_000, 3000), 120_000);
  return { mainFile, files, format, timeoutMs };
}

export async function renderLatex(raw: unknown): Promise<LatexRenderResult> {
  if (!raw || typeof raw !== "object") {
    return { success: false, error: "Invalid request", code: "VALIDATION" };
  }
  const req = raw as LatexRenderRequest;
  const { mainFile, files, format, timeoutMs } = normalizePayload(req);

  if (format === "svg") {
    return {
      success: false,
      error: 'SVG output requires a separate PDF-to-SVG converter (not bundled). Use format "pdf".',
      code: "UNSUPPORTED",
    };
  }

  const sanitized = sanitizeLatexFiles(files);
  if (!sanitized.ok) {
    return { success: false, error: sanitized.error, code: "VALIDATION" };
  }

  const validated = validateLatex(sanitized.files, mainFile);
  if (!validated.ok) {
    return { success: false, error: validated.error, code: "VALIDATION" };
  }

  const cache = getCache();
  const cached = await cache.get(mainFile, sanitized.files);
  if (cached) {
    return { success: true, outputPath: cached };
  }

  const jobDir = await fs.mkdtemp(path.join(app.getPath("temp"), "latex-job-"));
  try {
    for (const [rel, body] of Object.entries(sanitized.files)) {
      const abs = path.join(jobDir, rel);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, body, "utf8");
    }

    const { code, stdout, stderr, timedOut } = await runTectonicInDocker(jobDir, mainFile, timeoutMs);
    if (timedOut || code === 137 || code === null) {
      return {
        success: false,
        error: "LaTeX compile timed out or was killed",
        code: "TIMEOUT",
        stderr: truncateStderr(stderr || stdout),
      };
    }

    const pdfInJob = expectedPdfPath(jobDir, mainFile);

    if (code !== 0) {
      return {
        success: false,
        error: `Tectonic exited with code ${code}`,
        code: "TECTONIC",
        stderr: truncateStderr(stderr || stdout),
      };
    }

    let stat;
    try {
      stat = await fs.stat(pdfInJob);
    } catch {
      return {
        success: false,
        error: `Tectonic finished but output PDF not found at ${path.relative(jobDir, pdfInJob)}`,
        code: "TECTONIC",
        stderr: truncateStderr(stderr || stdout),
      };
    }
    if (!stat.isFile() || stat.size === 0) {
      return {
        success: false,
        error: "Tectonic produced an empty PDF",
        code: "TECTONIC",
        stderr: truncateStderr(stderr),
      };
    }

    const outputPath = await cache.set(mainFile, sanitized.files, pdfInJob);
    return { success: true, outputPath };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
      code: "IO",
    };
  } finally {
    await fs.rm(jobDir, { recursive: true, force: true }).catch(() => {});
  }
}
