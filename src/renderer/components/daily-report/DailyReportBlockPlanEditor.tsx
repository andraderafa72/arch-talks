import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDailyReportContext } from "@/contexts/DailyReportContext";
import type { DailyReportBlockSpec } from "@/types/daily-report";
import { dailyReportStrings } from "@/lib/uiCopy";
import {
  blockPlanToDrafts,
  draftsToBlockPlan,
  validateBlockPlanDrafts,
  type BlockPlanFieldError,
  type BlockPlanRowDraft,
} from "@/lib/dailyReportBlockPlanValidation";
import { useEditorStore } from "@/state/store";
import { blockPlanTotals } from "@/types/daily-report";

function fieldErrorMessage(
  t: ReturnType<typeof dailyReportStrings>,
  error: BlockPlanFieldError | undefined,
  field: "hours" | "count",
): string | undefined {
  if (!error) return undefined;
  if (field === "hours") {
    return error === "empty" ? t.blockPlanHoursEmpty : t.blockPlanHoursInvalid;
  }
  return error === "empty" ? t.blockPlanCountEmpty : t.blockPlanCountInvalid;
}

import type { DailyReportDocument } from "@/types/daily-report";

type DailyReportBlockPlanEditorProps = {
  selectedDate: string;
  document: DailyReportDocument | null;
  compact?: boolean;
};

export function DailyReportBlockPlanEditor({ selectedDate, document, compact }: DailyReportBlockPlanEditorProps) {
  const locale = useEditorStore((s) => s.locale);
  const t = dailyReportStrings(locale);
  const { setTaskBlockPlan, setBlockPlanValid } = useDailyReportContext();

  const [rows, setRows] = useState<BlockPlanRowDraft[]>(() =>
    blockPlanToDrafts(document?.date === selectedDate ? document.taskBlockPlan : undefined),
  );

  useEffect(() => {
    if (document?.date !== selectedDate) return;
    setRows(blockPlanToDrafts(document.taskBlockPlan));
    setBlockPlanValid(true);
  }, [selectedDate, document?.date, setBlockPlanValid]);

  const validation = useMemo(() => validateBlockPlanDrafts(rows), [rows]);
  const parsedPlan = useMemo(() => (validation.valid ? draftsToBlockPlan(rows) : []), [rows, validation.valid]);
  const { blockCount, totalHours } = blockPlanTotals(parsedPlan);

  useEffect(() => {
    setBlockPlanValid(validation.valid);
  }, [validation.valid, setBlockPlanValid]);

  useEffect(() => {
    if (!validation.valid) return;
    const next = parsedPlan.length > 0 ? parsedPlan : undefined;
    const current =
      document?.date === selectedDate && document.taskBlockPlan?.length
        ? document.taskBlockPlan
        : undefined;
    if (JSON.stringify(next) === JSON.stringify(current)) return;
    setTaskBlockPlan(next);
  }, [document?.date, document?.taskBlockPlan, parsedPlan, selectedDate, setTaskBlockPlan, validation.valid]);

  const updateRow = useCallback((index: number, patch: Partial<BlockPlanRowDraft>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }, []);

  const addSpec = () => {
    setRows((prev) => [...prev, { id: crypto.randomUUID(), hours: "", count: "" }]);
  };

  const removeSpec = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const totalLabel =
    rows.length > 0 && validation.valid
      ? t.blockPlanTotal.replace("{count}", String(blockCount)).replace("{hours}", String(totalHours))
      : rows.length > 0
        ? t.blockPlanInvalidSend
        : t.blockPlanEmpty;

  return (
    <div className={compact ? "px-3 pb-2 pt-2" : "border-b border-zinc-200 px-3 py-2 dark:border-zinc-700"}>
      {!compact ? (
        <>
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t.blockPlanTitle}
            </h3>
            <span
              className={`text-[10px] ${rows.length > 0 && !validation.valid ? "text-red-600 dark:text-red-400" : "text-zinc-400"}`}
            >
              {totalLabel}
            </span>
          </div>
          <p className="mb-2 text-[11px] leading-snug text-zinc-500">{t.blockPlanHint}</p>
        </>
      ) : null}

      {rows.length > 0 ? (
        <ul className={compact ? "mb-2 space-y-2" : "mb-2 space-y-3"}>
          {rows.map((row, index) => {
            const rowValidation = validation.rows[index]!;
            const hoursError = fieldErrorMessage(t, rowValidation.hoursError, "hours");
            const countError = fieldErrorMessage(t, rowValidation.countError, "count");

            return (
              <li key={row.id} className="w-full">
                <div className="flex w-full items-start gap-2">
                  <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-start gap-2">
                    <div className="min-w-0">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={row.hours}
                        onChange={(e) => updateRow(index, { hours: e.target.value })}
                        placeholder={t.blockPlanHours}
                        className={`h-8 w-full text-sm ${hoursError ? "border-red-500 focus-visible:ring-red-400" : ""}`}
                        aria-invalid={hoursError ? true : undefined}
                        aria-describedby={hoursError ? `block-hours-error-${row.id}` : undefined}
                      />
                      {hoursError ? (
                        <p id={`block-hours-error-${row.id}`} className="mt-0.5 text-[10px] text-red-600 dark:text-red-400">
                          {hoursError}
                        </p>
                      ) : null}
                    </div>
                    <span className={compact ? "mt-2.5 shrink-0 text-xs text-zinc-400" : "mt-2.5 shrink-0 text-xs text-zinc-400"}>
                      ×
                    </span>
                    <div className="min-w-0">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={row.count}
                        onChange={(e) => updateRow(index, { count: e.target.value })}
                        placeholder={t.blockPlanCount}
                        className={`h-8 w-full text-sm ${countError ? "border-red-500 focus-visible:ring-red-400" : ""}`}
                        aria-invalid={countError ? true : undefined}
                        aria-describedby={countError ? `block-count-error-${row.id}` : undefined}
                      />
                      {countError ? (
                        <p id={`block-count-error-${row.id}`} className="mt-0.5 text-[10px] text-red-600 dark:text-red-400">
                          {countError}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-0.5 h-8 w-8 shrink-0 px-0"
                    onClick={() => removeSpec(index)}
                    aria-label={t.removeEntry}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={addSpec}>
        <Plus className="h-3 w-3" />
        {t.addBlockSpec}
      </Button>
    </div>
  );
}
