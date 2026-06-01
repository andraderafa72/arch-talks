import { useCallback, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDailyReportContext } from "@/contexts/DailyReportContext";
import { dailyReportStrings } from "@/lib/uiCopy";
import { useEditorStore } from "@/state/store";
import type { DailyReportTaxonomy } from "@/types/daily-report";

const LIST_ROW_CLASS =
  "flex min-w-0 items-center gap-2 rounded-md border border-zinc-200 p-2 dark:border-zinc-700";
const LIST_INPUT_CLASS = "h-8 min-w-0 flex-1 text-sm";
const LIST_ID_CLASS = "w-28 shrink-0 truncate text-xs text-zinc-400";
const LIST_SELECT_TRIGGER_CLASS = "h-8 w-50 shrink-0 text-sm";

function uniqueSlug(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export function DailyReportSettingsPanel() {
  const locale = useEditorStore((s) => s.locale);
  const t = dailyReportStrings(locale);
  const { taxonomy, storageInfo, saveTaxonomy, pickStorageRoot, resetStorageRoot } = useDailyReportContext();
  const [draft, setDraft] = useState<DailyReportTaxonomy | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [taxonomyTab, setTaxonomyTab] = useState<"categories" | "task-types">("categories");

  const working = draft ?? taxonomy;

  const persist = useCallback(
    async (next: DailyReportTaxonomy) => {
      setSaving(true);
      setMessage(null);
      try {
        await saveTaxonomy(next);
        setDraft(null);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [saveTaxonomy],
  );

  if (!working) {
    return <p className="p-4 text-sm text-zinc-500">Loading…</p>;
  }

  const updateDraft = (next: DailyReportTaxonomy) => {
    setDraft(next);
  };

  const addCategory = () => {
    const ids = new Set(working.categories.map((c) => c.id));
    const id = uniqueSlug("category", ids);
    updateDraft({
      ...working,
      categories: [...working.categories, { id, label: "New category" }],
    });
  };

  const addTaskType = () => {
    const cat = working.categories[0];
    if (!cat) return;
    const ids = new Set(working.taskTypes.map((tt) => tt.id));
    const id = uniqueSlug("task", ids);
    updateDraft({
      ...working,
      taskTypes: [
        ...working.taskTypes,
        { id, categoryId: cat.id, label: "New task type" },
      ],
    });
  };

  const removeCategory = (id: string) => {
    updateDraft({
      ...working,
      categories: working.categories.filter((c) => c.id !== id),
      taskTypes: working.taskTypes.filter((tt) => tt.categoryId !== id),
    });
  };

  const removeTaskType = (id: string) => {
    updateDraft({
      ...working,
      taskTypes: working.taskTypes.filter((tt) => tt.id !== id),
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-4">
      <h2 className="text-lg font-semibold">{t.settings}</h2>

      <section className="mt-4">
        <h3 className="text-sm font-medium">{t.storageRoot}</h3>
        <p className="mt-1 break-all text-xs text-zinc-500">{storageInfo?.storageRoot ?? "—"}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => void pickStorageRoot()}>
            {t.chooseFolder}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => void resetStorageRoot()}>
            {t.resetStorage}
          </Button>
        </div>
      </section>

      <section className="mt-6 min-w-0">
        <Tabs value={taxonomyTab} onValueChange={(value) => setTaxonomyTab(value as "categories" | "task-types")}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="categories">{t.categories}</TabsTrigger>
            <TabsTrigger value="task-types">{t.taskTypes}</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-4 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-zinc-500">{t.categories}</p>
              <Button type="button" variant="secondary" size="sm" className="gap-1" onClick={addCategory}>
                <Plus className="h-3 w-3" />
                {t.addCategory}
              </Button>
            </div>
            <ul className="mt-2 space-y-2">
              {working.categories.map((cat) => (
                <li key={cat.id} className={LIST_ROW_CLASS}>
                  <Input
                    value={cat.label}
                    onChange={(e) => {
                      const label = e.target.value;
                      updateDraft({
                        ...working,
                        categories: working.categories.map((c) =>
                          c.id === cat.id ? { ...c, label } : c,
                        ),
                      });
                    }}
                    className={LIST_INPUT_CLASS}
                    aria-label={t.label}
                  />
                  <span className={LIST_ID_CLASS} title={`${t.id}: ${cat.id}`}>
                    {t.id}: {cat.id}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 shrink-0 px-2"
                    onClick={() => removeCategory(cat.id)}
                    aria-label={t.removeEntry}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </li>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="task-types" className="mt-4 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-zinc-500">{t.taskTypes}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1"
                onClick={addTaskType}
                disabled={working.categories.length === 0}
              >
                <Plus className="h-3 w-3" />
                {t.addTaskType}
              </Button>
            </div>
            {working.categories.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">{t.addCategory}</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {working.taskTypes.map((tt) => (
                  <li key={tt.id} className={LIST_ROW_CLASS}>
                    <Input
                      value={tt.label}
                      onChange={(e) => {
                        const label = e.target.value;
                        updateDraft({
                          ...working,
                          taskTypes: working.taskTypes.map((row) =>
                            row.id === tt.id ? { ...row, label } : row,
                          ),
                        });
                      }}
                      className={LIST_INPUT_CLASS}
                      aria-label={t.label}
                    />
                    <Select
                      value={tt.categoryId}
                      onValueChange={(categoryId) =>
                        updateDraft({
                          ...working,
                          taskTypes: working.taskTypes.map((row) =>
                            row.id === tt.id ? { ...row, categoryId } : row,
                          ),
                        })
                      }
                    >
                      <SelectTrigger className={LIST_SELECT_TRIGGER_CLASS} aria-label={t.selectCategory}>
                        <SelectValue placeholder={t.selectCategory} />
                      </SelectTrigger>
                      <SelectContent>
                        {working.categories.map((c) => (
                          <SelectItem key={c.id} value={c.id} title={c.label}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className={LIST_ID_CLASS} title={`${t.id}: ${tt.id}`}>
                      {t.id}: {tt.id}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 shrink-0 px-2"
                      onClick={() => removeTaskType(tt.id)}
                      aria-label={t.removeEntry}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {message ? <p className="mt-4 text-sm text-red-600">{message}</p> : null}

      <div className="mt-6">
        <Button
          type="button"
          disabled={!draft || saving}
          onClick={() => void persist(working)}
        >
          {saving ? t.saving : t.save}
        </Button>
      </div>
    </div>
  );
}
