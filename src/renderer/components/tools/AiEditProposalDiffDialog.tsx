import { DiffEditor } from "@monaco-editor/react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { MarkdownToPdfTheme } from "@/components/tools/markdownToPdfConfig";
import type { AiEditProposal } from "@/types";

type AiEditProposalDiffDialogProps = {
  proposal: AiEditProposal;
  theme: MarkdownToPdfTheme;
  onApply: () => void;
  onDismiss: () => void;
};

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  const j = path.lastIndexOf("\\");
  const k = Math.max(i, j);
  return k >= 0 ? path.slice(k + 1) : path;
}

export function AiEditProposalDiffDialog({ proposal, theme, onApply, onDismiss }: AiEditProposalDiffDialogProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  const monacoTheme = theme === "dark" ? "vs-dark" : "vs-light";

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 p-4 dark:bg-black/60"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-proposal-diff-title"
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <h2 id="ai-proposal-diff-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Revisar alteração sugerida
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Original à esquerda, proposta à direita —{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{basename(proposal.file)}</span>
          </p>
        </div>
        <div className="min-h-0 flex-1 border-b border-zinc-200 dark:border-zinc-700">
          <DiffEditor
            height="min(70vh, 560px)"
            width="100%"
            language="markdown"
            theme={monacoTheme}
            original={proposal.originalContent}
            modified={proposal.proposedContent}
            originalModelPath={`${proposal.id}/original.md`}
            modifiedModelPath={`${proposal.id}/modified.md`}
            options={{
              readOnly: true,
              renderSideBySide: true,
              minimap: { enabled: false },
              wordWrap: "on",
              fontSize: 14,
              scrollBeyondLastLine: false,
            }}
          />
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 px-4 py-3">
          <Button type="button" variant="secondary" size="sm" onClick={onDismiss}>
            Descartar
          </Button>
          <Button type="button" size="sm" onClick={onApply}>
            Aplicar alterações
          </Button>
        </div>
      </div>
    </div>
  );
}
