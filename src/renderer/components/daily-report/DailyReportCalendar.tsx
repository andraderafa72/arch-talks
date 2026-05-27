import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDailyReportContext } from "@/contexts/DailyReportContext";
import { dailyReportStrings } from "@/lib/uiCopy";
import { useEditorStore } from "@/state/store";
import { todayIsoDate } from "@/types/daily-report";

const WEEKDAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LABELS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function padDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function DailyReportCalendar() {
  const locale = useEditorStore((s) => s.locale);
  const t = dailyReportStrings(locale);
  const today = todayIsoDate();
  const {
    selectedDate,
    setSelectedDate,
    calendarYear,
    calendarMonth,
    setCalendarMonth,
    monthIndex,
  } = useDailyReportContext();

  const daysWithReports = new Set(monthIndex.map((d) => d.date));
  const totalDays = daysInMonth(calendarYear, calendarMonth);
  const firstWeekday = new Date(calendarYear, calendarMonth - 1, 1).getDay();
  const weekdays = locale === "pt" ? WEEKDAY_LABELS_PT : WEEKDAY_LABELS_EN;

  const monthLabel = new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(calendarYear, calendarMonth - 1, 1));

  const goPrev = () => {
    if (calendarMonth === 1) setCalendarMonth(calendarYear - 1, 12);
    else setCalendarMonth(calendarYear, calendarMonth - 1);
  };

  const goNext = () => {
    if (calendarMonth === 12) setCalendarMonth(calendarYear + 1, 1);
    else setCalendarMonth(calendarYear, calendarMonth + 1);
  };

  const cells: Array<{ day: number | null; date?: string }> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null });
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ day: d, date: padDate(calendarYear, calendarMonth, d) });
  }

  return (
    <div className="flex w-full shrink-0 flex-col self-start rounded-lg border border-zinc-200 bg-[var(--ui-panel-bg)] p-3 dark:border-zinc-700">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{t.calendar}</h2>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedDate(today)}>
          {t.today}
        </Button>
      </div>
      <div className="mb-2 flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 px-2" onClick={goPrev} aria-label={t.prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium capitalize">{monthLabel}</span>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 px-2" onClick={goNext} aria-label={t.nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-zinc-500">
        {weekdays.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1.5 content-start auto-rows-min">
        {cells.map((cell, idx) => {
          if (cell.day === null) {
            return <div key={`empty-${idx}`} className="h-10" />;
          }
          const date = cell.date!;
          const isSelected = date === selectedDate;
          const isToday = date === today;
          const hasReport = daysWithReports.has(date);
          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelectedDate(date)}
              className={`relative flex h-10 w-full flex-col items-center justify-center rounded-md text-base font-medium transition-colors ${
                isSelected
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
              } ${isToday && !isSelected ? "ring-1 ring-zinc-400 dark:ring-zinc-500" : ""}`}
            >
              {cell.day}
              {hasReport ? (
                <span
                  className={`absolute bottom-0.5 h-1 w-1 rounded-full ${
                    isSelected ? "bg-white dark:bg-zinc-900" : "bg-emerald-500"
                  }`}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
