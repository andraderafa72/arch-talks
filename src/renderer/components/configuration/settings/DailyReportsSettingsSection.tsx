import { DailyReportSettingsPanel } from "@/components/daily-report/DailyReportSettingsPanel";
import { DailyReportProvider } from "@/contexts/DailyReportContext";
import { dailyReportStrings } from "@/lib/uiCopy";
import { useEditorStore } from "@/state/store";

export function DailyReportsSettingsSection() {
  const locale = useEditorStore((s) => s.locale);
  const t = dailyReportStrings(locale);
  const hasElectron = typeof window !== "undefined" && Boolean(window.electronApi?.dailyReportLoad);

  if (!hasElectron) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-zinc-500">
        {t.electronRequired}
      </div>
    );
  }

  return (
    <DailyReportProvider>
      <DailyReportSettingsPanel />
    </DailyReportProvider>
  );
}
