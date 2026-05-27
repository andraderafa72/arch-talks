import { IntegrationSetupLink } from "@/components/configuration/IntegrationSetupLink";
import { Button } from "@/components/ui/button";
import { useIntegrationConfigured } from "@/hooks/useIntegrationConfigured";
import { integrationsStrings } from "@/lib/uiCopy";
import { useEditorStore } from "@/state/store";
import type { LatexRenderRequest, LatexRenderResult } from "@/types/electron-api";
import { useState } from "react";

const SAMPLE_TEX = `\\documentclass{article}
\\usepackage{amsmath}
\\begin{document}
Hello from \\textbf{Tectonic}.
\\[
  E = mc^2
\\]
\\end{document}
`;

type LatexTectonicDemoProps = {
  theme: "light" | "dark";
};

export function LatexTectonicDemo({ theme }: LatexTectonicDemoProps) {
  const locale = useEditorStore((state) => state.locale);
  const intl = integrationsStrings(locale);
  const tectonicConfigured = useIntegrationConfigured("tectonic");
  const [source, setSource] = useState(SAMPLE_TEX);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LatexRenderResult | null>(null);

  const api = typeof window !== "undefined" ? window.electronApi : undefined;

  const run = async (req: LatexRenderRequest) => {
    if (!api?.renderLatex) {
      setResult({
        success: false,
        error: "Electron API not available (open this screen in the desktop app).",
        code: "IO",
      });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const out = await api.renderLatex(req);
      setResult(out);
    } catch (e) {
      setResult({
        success: false,
        error: e instanceof Error ? e.message : String(e),
        code: "IO",
      });
    } finally {
      setBusy(false);
    }
  };

  const panelClass =
    theme === "dark"
      ? "border-zinc-700 bg-zinc-900 text-zinc-100"
      : "border-zinc-200 bg-[#fefefe] text-zinc-900";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-6">
      <div className={`max-w-4xl rounded-xl border p-6 shadow-sm ${panelClass}`}>
        <h1 className="text-xl font-semibold">LaTeX (Tectonic via Docker)</h1>
        <p className="mt-2 text-sm opacity-80">
          Compiles in an isolated temp directory via Docker with validation,{" "}
          <code className="text-xs">--untrusted</code>, and a timeout. Configure the Tectonic integration first. SVG is
          not supported yet.
        </p>
        {tectonicConfigured === false ? (
          <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
            {intl.tectonicHint} <IntegrationSetupLink locale={locale} />
          </p>
        ) : null}

        <label className="mt-4 block text-sm font-medium" htmlFor="latex-source">
          main.tex
        </label>
        <textarea
          id="latex-source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          spellCheck={false}
          className="mt-1 h-64 w-full resize-y rounded-md border border-zinc-300 bg-transparent p-3 font-mono text-sm dark:border-zinc-600"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => void run({ files: { "main.tex": source }, format: "pdf" })}>
            {busy ? "Compiling…" : "Compile PDF"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void run({ files: { "main.tex": source }, format: "svg" })}
          >
            Try SVG (expected error)
          </Button>
        </div>

        {result ? (
          <div className="mt-4 rounded-md border border-zinc-300 p-3 text-sm dark:border-zinc-600">
            {result.success ? (
              <div className="space-y-2">
                <p className="font-medium text-emerald-600 dark:text-emerald-400">Success</p>
                <p className="break-all font-mono text-xs">{result.outputPath}</p>
                {result.outputPath && api?.openPathInUserData ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void api.openPathInUserData(result.outputPath ?? "")}
                  >
                    Open PDF
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-medium text-red-600 dark:text-red-400">Failed {result.code ? `(${result.code})` : ""}</p>
                <p>{result.error}</p>
                {result.stderr ? (
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all text-xs opacity-90">{result.stderr}</pre>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
