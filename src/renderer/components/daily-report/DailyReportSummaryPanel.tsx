import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDailyReportContext } from "@/contexts/DailyReportContext";
import { dailyReportStrings } from "@/lib/uiCopy";
import { useEditorStore } from "@/state/store";
import { formatDisplayDate } from "@/types/daily-report";

export function DailyReportSummaryPanel() {
  const locale = useEditorStore((s) => s.locale);
  const t = dailyReportStrings(locale);
  const {
    selectedDate,
    document,
    taxonomy,
    isDirty,
    isSaving,
    addEntry,
    removeEntry,
    updateEntry,
    updateNarrative,
  } = useDailyReportContext();

  const saveStatusLabel = isSaving ? t.saving : isDirty ? t.save : t.saved;

  const entries = document?.entries ?? [];
  const totalHours = entries.reduce((sum, e) => sum + (Number.isFinite(e.hours) ? e.hours : 0), 0);

  const categoryLabel = (id: string) => taxonomy?.categories.find((c) => c.id === id)?.label ?? id;
  const typesForCategory = (categoryId: string) =>
    taxonomy?.taskTypes.filter((tt) => tt.categoryId === categoryId) ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-zinc-200 bg-[var(--ui-panel-bg)] dark:border-zinc-700">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
        <div>
          <h2 className="text-sm font-semibold">{t.summary}</h2>
          <p className="text-xs text-zinc-500">{formatDisplayDate(selectedDate, locale)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">
            {t.totalHours}: {totalHours.toFixed(1)}h
          </span>
          <span
            className={cn(
              "min-w-[4.5rem] text-right text-xs font-medium",
              isSaving && "text-zinc-500",
              isDirty && !isSaving && "text-amber-600 dark:text-amber-400",
              !isDirty && !isSaving && "text-zinc-500",
            )}
            aria-live="polite"
          >
            {saveStatusLabel}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{t.narrative}</label>
        <textarea
          value={document?.narrative ?? ""}
          onChange={(e) => updateNarrative(e.target.value || undefined)}
          rows={2}
          className="mb-4 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          placeholder={t.narrative}
        />

        {entries.length === 0 ? (
          <p className="text-sm text-zinc-500">{t.noEntries}</p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-md border border-zinc-200 p-3 dark:border-zinc-700"
              >
                <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-[10px] font-medium uppercase text-zinc-500">
                      {t.hours}
                    </label>
                    <Input
                      type="number"
                      min={0.25}
                      step={0.25}
                      value={entry.hours}
                      onChange={(e) =>
                        updateEntry(entry.id, { hours: parseFloat(e.target.value) || 0 })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-medium uppercase text-zinc-500">
                      {t.category}
                    </label>
                    <Select
                      value={entry.categoryId}
                      onValueChange={(categoryId) => {
                        const types = typesForCategory(categoryId);
                        updateEntry(entry.id, {
                          categoryId,
                          taskTypeId: types[0]?.id ?? entry.taskTypeId,
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={t.selectCategory} />
                      </SelectTrigger>
                      <SelectContent>
                        {taxonomy?.categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-1 block text-[10px] font-medium uppercase text-zinc-500">
                      {t.taskType}
                    </label>
                    <Select
                      value={entry.taskTypeId}
                      onValueChange={(taskTypeId) => updateEntry(entry.id, { taskTypeId })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={t.selectType} />
                      </SelectTrigger>
                      <SelectContent>
                        {typesForCategory(entry.categoryId).map((tt) => (
                          <SelectItem key={tt.id} value={tt.id}>
                            {tt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 px-2 text-red-600"
                      onClick={() => removeEntry(entry.id)}
                      aria-label={t.removeEntry}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase text-zinc-500">
                    {t.description}
                  </label>
                  <textarea
                    value={entry.description}
                    onChange={(e) => updateEntry(entry.id, { description: e.target.value })}
                    rows={2}
                    className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <p className="mt-1 text-[10px] text-zinc-400">
                  {categoryLabel(entry.categoryId)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-zinc-200 p-2 dark:border-zinc-700">
        <Button type="button" variant="secondary" size="sm" className="w-full gap-1" onClick={addEntry}>
          <Plus className="h-4 w-4" />
          {t.addEntry}
        </Button>
      </div>
    </div>
  );
}
