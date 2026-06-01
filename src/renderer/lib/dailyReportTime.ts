/** Minimum tracked duration when stopping a timer (1 minute). */
export const MIN_TRACKED_HOURS = 1 / 60;

export const QUARTER_HOUR = 0.25;

export function elapsedMsToHours(startedAt: string, endedAt: string): number {
  const start = Date.parse(startedAt);
  const end = Date.parse(endedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return MIN_TRACKED_HOURS;
  const hours = (end - start) / 3_600_000;
  return Math.max(MIN_TRACKED_HOURS, Math.round(hours * 100) / 100);
}

/** Round hours up to the next 15-minute block (minimum 15m). */
export function roundUpToQuarterHours(hours: number): number {
  if (!Number.isFinite(hours) || hours <= 0) return QUARTER_HOUR;
  return Math.ceil(hours / QUARTER_HOUR) * QUARTER_HOUR;
}

export function formatQuarterHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Display decimal hours as Xh YYm (for read-only labels). */
export function formatHoursLabel(hours: number): string {
  const totalMinutes = Math.round(Math.max(0, hours) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export type ActiveTrackerElapsedFields = {
  startedAt: string;
  accumulatedMs?: number;
  paused?: boolean;
};

export function activeTrackerElapsedMs(tracker: ActiveTrackerElapsedFields, now = Date.now()): number {
  const accumulated = Math.max(0, tracker.accumulatedMs ?? 0);
  if (tracker.paused) return accumulated;
  const segmentStart = Date.parse(tracker.startedAt);
  if (!Number.isFinite(segmentStart)) return accumulated;
  return accumulated + Math.max(0, now - segmentStart);
}

export function msToHours(ms: number): number {
  return Math.max(MIN_TRACKED_HOURS, Math.round((ms / 3_600_000) * 100) / 100);
}

/** Parse H:MM:SS, MM:SS, or M:SS into milliseconds. */
export function parseDurationInputToMs(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || Number.isNaN(Number(p)))) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => n < 0 || !Number.isFinite(n))) return null;
  let h = 0;
  let m = 0;
  let s = 0;
  if (nums.length === 3) {
    [h, m, s] = nums;
  } else if (nums.length === 2) {
    [m, s] = nums;
  } else if (nums.length === 1) {
    s = nums[0]!;
  } else {
    return null;
  }
  if (m >= 60 || s >= 60) return null;
  const totalSec = h * 3600 + m * 60 + s;
  if (totalSec <= 0) return null;
  return totalSec * 1000;
}

export function formatElapsedDuration(elapsedMs: number): string {
  const totalSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
