import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/state/store";
import type { VaultCategory } from "@/types";
import type { UiLocale } from "@/types";

const CATEGORIES: Array<{
  id: VaultCategory;
  titleEn: string;
  titlePt: string;
  descEn: string;
  descPt: string;
}> = [
  {
    id: "business",
    titleEn: "Business vault",
    titlePt: "Cofre de negócio",
    descEn: "Operational knowledge by business capability",
    descPt: "Conhecimento operacional por capacidade de negócio",
  },
  {
    id: "technical",
    titleEn: "Technical vault",
    titlePt: "Cofre técnico",
    descEn: "Knowledge mirroring applications and modules",
    descPt: "Conhecimento espelhando aplicações e módulos",
  },
  {
    id: "project",
    titleEn: "Project vault",
    titlePt: "Cofre de projeto",
    descEn: "Execution layer linking business rules to technical implementation",
    descPt: "Camada de execução ligando regras de negócio à implementação técnica",
  },
];

function categoryButtonClass(active: boolean) {
  return cn(
    "rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
    active
      ? "border-zinc-900 bg-zinc-100 shadow-sm dark:border-zinc-300 dark:bg-zinc-800"
      : "border-zinc-200 bg-[#fefefe] hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800/80",
  );
}

type VaultCategoryGateProps = {
  documentId: string;
  locale: UiLocale;
};

export function VaultCategoryGate({ documentId, locale }: VaultCategoryGateProps) {
  const assignVaultCategory = useEditorStore((state) => state.assignVaultCategory);
  const [selected, setSelected] = useState<VaultCategory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setError(null);
    setSubmitting(true);
    try {
      await assignVaultCategory(documentId, selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign vault category");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-[#fefefe] p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {locale === "pt" ? "Escolher categoria do cofre" : "Choose vault category"}
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          {locale === "pt"
            ? "A categoria não pode ser alterada depois. Define como o conhecimento é organizado e quais competências de ingestão se aplicam."
            : "Category cannot be changed later. It defines how knowledge is organized and which ingestion skills apply."}
        </p>

        <div className="mt-4 grid gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelected(cat.id)}
              className={categoryButtonClass(selected === cat.id)}
              aria-pressed={selected === cat.id}
            >
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {locale === "pt" ? cat.titlePt : cat.titleEn}
              </span>
              <p className="mt-1 text-xs font-normal text-zinc-600 dark:text-zinc-400">
                {locale === "pt" ? cat.descPt : cat.descEn}
              </p>
            </button>
          ))}
        </div>

        {error ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <Button className="mt-4 w-full" disabled={!selected || submitting} onClick={() => void handleConfirm()}>
          {submitting
            ? locale === "pt"
              ? "A guardar…"
              : "Saving…"
            : locale === "pt"
              ? "Confirmar categoria"
              : "Confirm category"}
        </Button>
      </div>
    </div>
  );
}
