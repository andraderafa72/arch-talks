import { Clock, Pencil, Pause, Play, Plus, RotateCcw, Square, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDailyReportContext } from "@/contexts/DailyReportContext";
import {
  formatElapsedDuration,
  formatQuarterHours,
  parseDurationInputToMs,
  roundUpToQuarterHours,
} from "@/lib/dailyReportTime";
import { dailyReportStrings } from "@/lib/uiCopy";
import { useEditorStore } from "@/state/store";
import type { DailyReportTimeLogEntry } from "@/types/daily-report";
import { formatDisplayDate } from "@/types/daily-report";

type DailyReportTimeTrackerProps = {
  embedded?: boolean;
};

function isoToTimeValue(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function timeOnDateToIso(date: string, time: string): string {
  const [h, m] = time.split(":").map(Number);
  const [y, mo, d] = date.split("-").map(Number);
  const dt = new Date(y!, mo! - 1, d!, h ?? 0, m ?? 0, 0, 0);
  return dt.toISOString();
}

export function DailyReportTimeTracker({ embedded = false }: DailyReportTimeTrackerProps) {
  const locale = useEditorStore((s) => s.locale);
  const t = dailyReportStrings(locale);
  const {
    selectedDate,
    setSelectedDate,
    taxonomy,
    activeTimeTracker,
    isTrackerPaused,
    elapsedMs,
    timeLogs,
    startTimeTracker,
    updateActiveTimeTracker,
    pauseTimeTracker,
    resumeTimeTracker,
    restartTimeTracker,
    setActiveTimeTrackerElapsed,
    stopTimeTracker,
    addTimeLogToSummary,
    updateTimeLog,
    deleteTimeLog,
  } = useDailyReportContext();

  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [taskTypeId, setTaskTypeId] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingDuration, setEditingDuration] = useState(false);
  const [durationInput, setDurationInput] = useState("");
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [logDraft, setLogDraft] = useState<{
    description: string;
    startTime: string;
    endTime: string;
    categoryId: string;
    taskTypeId: string;
  } | null>(null);

  const isRunning = Boolean(activeTimeTracker);
  const isOnOtherDay = isRunning && activeTimeTracker!.date !== selectedDate;
  const isControllingThisDay = isRunning && activeTimeTracker!.date === selectedDate;
  const canStart = !isRunning && description.trim().length > 0;
  const showPlayer = isControllingThisDay || isOnOtherDay;

  const categoryLabel = (id: string) => taxonomy?.categories.find((c) => c.id === id)?.label ?? id;
  const typesForCategory = (catId: string) =>
    taxonomy?.taskTypes.filter((tt) => tt.categoryId === catId) ?? [];

  useEffect(() => {
    if (!activeTimeTracker) {
      setDescription("");
      setCategoryId("");
      setTaskTypeId("");
      setEditingDuration(false);
      return;
    }
    setDescription(activeTimeTracker.description);
    setCategoryId(activeTimeTracker.categoryId ?? "");
    setTaskTypeId(activeTimeTracker.taskTypeId ?? "");
  }, [activeTimeTracker]);

  const syncRunningFields = useCallback(
    (patch: { description?: string; categoryId?: string; taskTypeId?: string }) => {
      if (!isControllingThisDay) return;
      void updateActiveTimeTracker(patch);
    },
    [isControllingThisDay, updateActiveTimeTracker],
  );

  const handleStart = () => {
    setActionError(null);
    void startTimeTracker(description, categoryId || undefined, taskTypeId || undefined);
  };

  const handleStop = async () => {
    setActionError(null);
    const result = await stopTimeTracker({
      description,
      categoryId: categoryId || undefined,
      taskTypeId: taskTypeId || undefined,
    });
    if (!result.ok) {
      setActionError(
        result.error === "Select both category and task type, or leave both empty."
          ? t.timeTrackerCategoryRequired
          : result.error === "Description is required"
            ? t.timeTrackerDescriptionRequired
            : result.error,
      );
      return;
    }
    setDescription("");
    setCategoryId("");
    setTaskTypeId("");
    setEditingDuration(false);
  };

  const openEditDuration = () => {
    setDurationInput(formatElapsedDuration(elapsedMs));
    setEditingDuration(true);
  };

  const applyDuration = () => {
    const ms = parseDurationInputToMs(durationInput);
    if (ms === null) return;
    void setActiveTimeTrackerElapsed(ms);
    setEditingDuration(false);
  };

  const beginEditLog = (log: DailyReportTimeLogEntry) => {
    setEditingLogId(log.id);
    setLogDraft({
      description: log.description,
      startTime: isoToTimeValue(log.startedAt),
      endTime: isoToTimeValue(log.endedAt),
      categoryId: log.categoryId ?? "",
      taskTypeId: log.taskTypeId ?? "",
    });
  };

  const saveLogEdit = async () => {
    if (!editingLogId || !logDraft) return;
    const result = await updateTimeLog(editingLogId, {
      description: logDraft.description,
      startedAt: timeOnDateToIso(selectedDate, logDraft.startTime),
      endedAt: timeOnDateToIso(selectedDate, logDraft.endTime),
      categoryId: logDraft.categoryId || undefined,
      taskTypeId: logDraft.taskTypeId || undefined,
    });
    if (result.ok) {
      setEditingLogId(null);
      setLogDraft(null);
    }
  };

  const removeLog = async (logId: string) => {
    await deleteTimeLog(logId);
    if (editingLogId === logId) {
      setEditingLogId(null);
      setLogDraft(null);
    }
  };

  const formatLogRange = (startedAt: string, endedAt: string) => {
    const fmt = new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${fmt.format(new Date(startedAt))} – ${fmt.format(new Date(endedAt))}`;
  };

  const playerBtnClass =
    "h-9 w-9 shrink-0 rounded-full border border-[var(--ui-panel-border)] bg-[var(--ui-panel-bg)] text-[var(--ui-shell-fg)] hover:bg-[var(--ui-chat-tab-hover-bg)]";

  return (
    <section
      className={
        embedded
          ? "flex h-full min-h-0 flex-col"
          : "mb-4 flex min-h-0 flex-col rounded-md border border-[var(--ui-panel-border)]"
      }
    >
      {!embedded ? (
        <div className="shrink-0 border-b border-[var(--ui-panel-border)] px-3 py-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ui-muted-fg)]">
            {t.timeTrackerTitle}
          </h3>
        </div>
      ) : null}

      {isOnOtherDay ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <span>
            {t.timeTrackerOnOtherDay.replace(
              "{date}",
              formatDisplayDate(activeTimeTracker!.date, locale),
            )}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedDate(activeTimeTracker!.date)}
          >
            {t.timeTrackerGoToDay}
          </Button>
        </div>
      ) : null}

      <div className="shrink-0 space-y-3 border-b border-[var(--ui-panel-border)] p-3">
        {showPlayer ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-[var(--ui-panel-border)] bg-[var(--ui-shell-bg)] px-3 py-4">
            <span className="text-xs font-medium text-[var(--ui-muted-fg)]">
              {isTrackerPaused ? t.timeTrackerPaused : t.timeTrackerRunning}
            </span>
            <span className="font-mono text-3xl tabular-nums tracking-tight text-[var(--ui-shell-fg)]">
              {formatElapsedDuration(elapsedMs)}
            </span>
            <div className="flex items-center gap-2">
              {isControllingThisDay ? (
                <>
                  {isTrackerPaused ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={playerBtnClass}
                      title={t.timeTrackerResume}
                      aria-label={t.timeTrackerResume}
                      onClick={() => void resumeTimeTracker()}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={playerBtnClass}
                      title={t.timeTrackerPause}
                      aria-label={t.timeTrackerPause}
                      onClick={() => void pauseTimeTracker()}
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={playerBtnClass}
                    title={t.timeTrackerStop}
                    aria-label={t.timeTrackerStop}
                    onClick={() => void handleStop()}
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={playerBtnClass}
                    title={t.timeTrackerRestart}
                    aria-label={t.timeTrackerRestart}
                    onClick={() => void restartTimeTracker()}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={playerBtnClass}
                    title={t.timeTrackerEditTime}
                    aria-label={t.timeTrackerEditTime}
                    onClick={openEditDuration}
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={() => void handleStop()}
                >
                  <Square className="h-3.5 w-3.5" />
                  {t.timeTrackerStop}
                </Button>
              )}
            </div>
            {editingDuration ? (
              <div className="flex w-full max-w-xs items-center gap-2">
                <Input
                  value={durationInput}
                  onChange={(e) => setDurationInput(e.target.value)}
                  placeholder={t.timeTrackerEditTimeHint}
                  className="h-8 font-mono text-sm"
                />
                <Button type="button" size="sm" className="h-8" onClick={applyDuration}>
                  {t.timeTrackerApplyTime}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => setEditingDuration(false)}
                >
                  {t.timeTrackerCancelEdit}
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex justify-center">
            <Button
              type="button"
              size="sm"
              className="h-10 gap-2 rounded-full px-5"
              disabled={!canStart}
              onClick={handleStart}
            >
              <Play className="h-4 w-4" />
              {t.timeTrackerStart}
            </Button>
          </div>
        )}

        {!showPlayer ? (
          <>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase text-[var(--ui-muted-fg)]">
                {t.timeTrackerDescription}
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.timeTrackerDescriptionPlaceholder}
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase text-[var(--ui-muted-fg)]">
                  {t.category}
                </label>
                <Select
                  value={categoryId || "__none__"}
                  onValueChange={(v) => {
                    const next = v === "__none__" ? "" : v;
                    setCategoryId(next);
                    setTaskTypeId("");
                  }}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={t.selectCategory} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {taxonomy?.categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase text-[var(--ui-muted-fg)]">
                  {t.taskType}
                </label>
                <Select
                  value={taskTypeId || "__none__"}
                  onValueChange={(v) => setTaskTypeId(v === "__none__" ? "" : v)}
                  disabled={!categoryId}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={t.selectType} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {typesForCategory(categoryId).map((tt) => (
                      <SelectItem key={tt.id} value={tt.id}>
                        {tt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase text-[var(--ui-muted-fg)]">
                {t.timeTrackerDescription}
              </label>
              <Input
                value={description}
                onChange={(e) => {
                  const v = e.target.value;
                  setDescription(v);
                  syncRunningFields({ description: v });
                }}
                placeholder={t.timeTrackerDescriptionPlaceholder}
                disabled={!isControllingThisDay}
                className="h-8 text-sm"
              />
            </div>
            {isControllingThisDay ? (
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={categoryId || "__none__"}
                  onValueChange={(v) => {
                    const next = v === "__none__" ? "" : v;
                    setCategoryId(next);
                    setTaskTypeId("");
                    syncRunningFields({ categoryId: next || undefined, taskTypeId: undefined });
                  }}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={t.selectCategory} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {taxonomy?.categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={taskTypeId || "__none__"}
                  onValueChange={(v) => {
                    const next = v === "__none__" ? "" : v;
                    setTaskTypeId(next);
                    syncRunningFields({ taskTypeId: next || undefined });
                  }}
                  disabled={!categoryId}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={t.selectType} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {typesForCategory(categoryId).map((tt) => (
                      <SelectItem key={tt.id} value={tt.id}>
                        {tt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </>
        )}

        {actionError ? (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {actionError}
          </p>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-[var(--ui-panel-border)] px-3 py-2 text-xs font-medium text-[var(--ui-muted-fg)]">
          {t.timeTrackerLog}
        </div>
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {timeLogs.length === 0 ? (
            <li className="text-xs text-[var(--ui-muted-fg)]">{t.timeTrackerLogEmpty}</li>
          ) : (
            timeLogs.map((log) => {
              const summaryHours = roundUpToQuarterHours(log.hours);
              const summaryLabel = formatQuarterHours(summaryHours);
              const isEditing = editingLogId === log.id && logDraft;

              if (isEditing) {
                return (
                  <li
                    key={log.id}
                    className="space-y-2 rounded border border-[var(--ui-panel-border)] bg-[var(--ui-shell-bg)] p-2 text-xs"
                  >
                    <Input
                      value={logDraft.description}
                      onChange={(e) =>
                        setLogDraft((d) => (d ? { ...d, description: e.target.value } : d))
                      }
                      className="h-8 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-[10px] text-[var(--ui-muted-fg)]">
                          {t.timeTrackerStartTime}
                        </label>
                        <Input
                          type="time"
                          value={logDraft.startTime}
                          onChange={(e) =>
                            setLogDraft((d) => (d ? { ...d, startTime: e.target.value } : d))
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] text-[var(--ui-muted-fg)]">
                          {t.timeTrackerEndTime}
                        </label>
                        <Input
                          type="time"
                          value={logDraft.endTime}
                          onChange={(e) =>
                            setLogDraft((d) => (d ? { ...d, endTime: e.target.value } : d))
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={logDraft.categoryId || "__none__"}
                        onValueChange={(v) => {
                          const next = v === "__none__" ? "" : v;
                          setLogDraft((d) =>
                            d ? { ...d, categoryId: next, taskTypeId: "" } : d,
                          );
                        }}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={t.category} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {taxonomy?.categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={logDraft.taskTypeId || "__none__"}
                        onValueChange={(v) =>
                          setLogDraft((d) =>
                            d ? { ...d, taskTypeId: v === "__none__" ? "" : v } : d,
                          )
                        }
                        disabled={!logDraft.categoryId}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={t.taskType} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {typesForCategory(logDraft.categoryId).map((tt) => (
                            <SelectItem key={tt.id} value={tt.id}>
                              {tt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" className="h-7" onClick={() => void saveLogEdit()}>
                        {t.timeTrackerSaveLog}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        onClick={() => {
                          setEditingLogId(null);
                          setLogDraft(null);
                        }}
                      >
                        {t.timeTrackerCancelEdit}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-red-600"
                        onClick={() => void removeLog(log.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t.timeTrackerDeleteLog}
                      </Button>
                    </div>
                  </li>
                );
              }

              return (
                <li
                  key={log.id}
                  className="rounded border border-[var(--ui-panel-border)] px-2 py-1.5 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap justify-between gap-2 text-[var(--ui-muted-fg)]">
                        <span>{formatLogRange(log.startedAt, log.endedAt)}</span>
                        <span className="tabular-nums">{log.hours.toFixed(2)}h</span>
                      </div>
                      <p className="mt-0.5 text-[var(--ui-shell-fg)]">{log.description}</p>
                      {log.categoryId ? (
                        <p className="mt-0.5 text-[10px] text-[var(--ui-muted-fg)]">
                          {categoryLabel(log.categoryId)}
                          {log.taskTypeId
                            ? ` · ${taxonomy?.taskTypes.find((tt) => tt.id === log.taskTypeId)?.label ?? log.taskTypeId}`
                            : ""}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[10px] text-[var(--ui-muted-fg)]">
                        {log.summaryEntryId
                          ? `${t.timeTrackerInSummary} · ${t.timeTrackerSummaryHours.replace("{hours}", summaryLabel)}`
                          : t.timeTrackerSummaryHours.replace("{hours}", summaryLabel)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-0.5">
                      {!log.summaryEntryId ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 px-0"
                          title={t.timeTrackerAddToSummary}
                          aria-label={t.timeTrackerAddToSummary}
                          onClick={() => void addTimeLogToSummary(log.id)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 px-0"
                        title={t.timeTrackerEditLog}
                        aria-label={t.timeTrackerEditLog}
                        onClick={() => beginEditLog(log)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 px-0 text-red-600"
                        title={t.timeTrackerDeleteLog}
                        aria-label={t.timeTrackerDeleteLog}
                        onClick={() => void removeLog(log.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </section>
  );
}
