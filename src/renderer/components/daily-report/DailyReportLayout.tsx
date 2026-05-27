import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DailyReportCalendar } from "@/components/daily-report/DailyReportCalendar";
import { DailyReportChatPanel } from "@/components/daily-report/DailyReportChatPanel";
import { DailyReportSettingsPanel } from "@/components/daily-report/DailyReportSettingsPanel";
import { DailyReportSummaryPanel } from "@/components/daily-report/DailyReportSummaryPanel";
import { useDailyReportContext } from "@/contexts/DailyReportContext";
import { dailyReportStrings } from "@/lib/uiCopy";
import { useEditorStore } from "@/state/store";

export function DailyReportLayout() {
  const locale = useEditorStore((s) => s.locale);
  const t = dailyReportStrings(locale);
  const { view, setView, isLoading, error } = useDailyReportContext();

  if (view === "settings") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
          <Button type="button" variant="ghost" size="sm" onClick={() => setView("report")}>
            ← {t.title}
          </Button>
        </div>
        <DailyReportSettingsPanel />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <div>
          <h1 className="text-lg font-semibold">{t.title}</h1>
          <p className="text-sm text-zinc-500">{t.subtitle}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1.5"
          onClick={() => setView("settings")}
        >
          <Settings className="h-4 w-4" />
          {t.settings}
        </Button>
      </div>

      {error ? (
        <div className="mx-4 mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">Loading…</div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[300px_1fr_420px] lg:grid-rows-1">
          <div className="min-h-0 lg:self-start">
            <DailyReportCalendar />
          </div>
          <div className="min-h-[320px] lg:min-h-0">
            <DailyReportSummaryPanel />
          </div>
          <div className="min-h-[320px] lg:min-h-0">
            <DailyReportChatPanel />
          </div>
        </div>
      )}
    </div>
  );
}
