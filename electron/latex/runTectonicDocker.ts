import { spawn } from "node:child_process";
import path from "node:path";
import { TECTONIC_IMAGE } from "../../shared/integrations.ts";

/** Tectonic 0.16+ resolves bare `main.tex` incorrectly; require an explicit relative path. */
export function tectonicInputArg(mainRelative: string): string {
  const posix = mainRelative.replace(/\\/g, "/");
  return posix.startsWith("./") ? posix : `./${posix}`;
}

function runDocker(
  args: string[],
  timeoutMs: number,
): Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolvePromise) => {
    const child = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (c: string) => {
      stdout += c;
    });
    child.stderr?.on("data", (c: string) => {
      stderr += c;
    });
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }, timeoutMs);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({ code, stdout, stderr, timedOut });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolvePromise({ code: -1, stdout, stderr: `${stderr}\n${err.message}`, timedOut: false });
    });
  });
}

export async function runTectonicInDocker(
  jobDir: string,
  mainRelative: string,
  timeoutMs: number,
): Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }> {
  const inputArg = tectonicInputArg(mainRelative);
  const runArgs = [
    "run",
    "--rm",
    "-v",
    `${jobDir}:/work:rw`,
    "-w",
    "/work",
    "-e",
    "TECTONIC_UNTRUSTED_MODE=1",
    TECTONIC_IMAGE,
    "tectonic",
    "--untrusted",
    inputArg,
  ];
  const runResult = await runDocker(runArgs, timeoutMs);
  if (runResult.code !== 0 && /Cannot connect to the Docker daemon/i.test(runResult.stderr)) {
    return {
      ...runResult,
      stderr: `${runResult.stderr}\nStart Docker and configure LaTeX (Tectonic) under Configuration → Integrations.`,
    };
  }
  if (runResult.code !== 0 && /Unable to find image|pull access denied|not found/i.test(runResult.stderr)) {
    return {
      ...runResult,
      stderr: `${runResult.stderr}\nOpen Configuration → Integrations and click Execute for LaTeX (Tectonic) to pull the image.`,
    };
  }
  return runResult;
}

export function expectedPdfPath(jobDir: string, mainRelative: string): string {
  const pdfRel = mainRelative.replace(/\\/g, "/").replace(/\.tex$/i, ".pdf");
  return path.join(jobDir, pdfRel);
}
