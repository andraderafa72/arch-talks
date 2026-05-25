/** Base reveal speed when backlog is small (characters per second). */
export const STREAMING_REVEAL_BASE_CHARS_PER_SEC = 40;

/** Backlog length above which reveal speed scales up. */
export const STREAMING_REVEAL_CATCHUP_THRESHOLD = 80;

/** Maximum multiplier applied to base speed for large backlogs. */
export const STREAMING_REVEAL_MAX_CATCHUP_MULTIPLIER = 8;

/**
 * Computes the next reveal index given current position, target length, and elapsed time.
 * Reveals at least 1 character per tick when behind target.
 */
export function computeNextRevealIndex(
  current: number,
  targetLength: number,
  elapsedMs: number,
): number {
  if (current >= targetLength || elapsedMs <= 0) {
    return Math.min(current, targetLength);
  }

  const backlog = targetLength - current;
  const catchupRatio = Math.min(
    backlog / STREAMING_REVEAL_CATCHUP_THRESHOLD,
    STREAMING_REVEAL_MAX_CATCHUP_MULTIPLIER,
  );
  const charsPerSec = STREAMING_REVEAL_BASE_CHARS_PER_SEC * Math.max(1, catchupRatio);
  const delta = Math.max(1, Math.floor((charsPerSec * elapsedMs) / 1000));

  return Math.min(current + delta, targetLength);
}
