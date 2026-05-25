import { useEffect, useRef, useState } from "react";
import { computeNextRevealIndex } from "@/lib/streamingTextReveal";

const REVEAL_TICK_MS = 16;

export type UseStreamingTextRevealOptions = {
  text: string;
  streamId: string;
  enabled: boolean;
  onReveal?: () => void;
};

export type UseStreamingTextRevealResult = {
  displayedText: string;
  isAnimating: boolean;
};

export function useStreamingTextReveal({
  text,
  streamId,
  enabled,
  onReveal,
}: UseStreamingTextRevealOptions): UseStreamingTextRevealResult {
  const [revealedIndex, setRevealedIndex] = useState(0);
  const revealedIndexRef = useRef(0);
  const lastTickMsRef = useRef(performance.now());
  const streamIdRef = useRef(streamId);
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  useEffect(() => {
    if (streamIdRef.current === streamId) return;
    streamIdRef.current = streamId;
    revealedIndexRef.current = 0;
    setRevealedIndex(0);
    lastTickMsRef.current = performance.now();
  }, [streamId]);

  useEffect(() => {
    if (enabled) return;
    const full = text.length;
    if (revealedIndexRef.current !== full) {
      revealedIndexRef.current = full;
      setRevealedIndex(full);
    }
  }, [enabled, text]);

  useEffect(() => {
    if (!enabled) return;

    let rafId = 0;

    const tick = (now: number) => {
      const targetLength = text.length;
      let current = revealedIndexRef.current;

      if (current > targetLength) {
        current = targetLength;
        revealedIndexRef.current = current;
        setRevealedIndex(current);
      }

      if (current < targetLength) {
        const elapsedMs = now - lastTickMsRef.current;
        if (elapsedMs >= REVEAL_TICK_MS) {
          const next = computeNextRevealIndex(current, targetLength, elapsedMs);
          if (next > current) {
            revealedIndexRef.current = next;
            setRevealedIndex(next);
            onRevealRef.current?.();
          }
          lastTickMsRef.current = now;
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [enabled, text]);

  const displayedText = enabled ? text.slice(0, revealedIndex) : text;
  const isAnimating = enabled && revealedIndex < text.length;

  return { displayedText, isAnimating };
}
