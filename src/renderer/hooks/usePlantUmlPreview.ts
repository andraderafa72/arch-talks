import { useEffect, useRef, useState } from "react";
import { fetchPlantUmlPngBlob } from "@/lib/plantumlKroki";

const DEFAULT_DEBOUNCE_MS = 400;

export type UsePlantUmlPreviewOptions = {
  /** When false, clears preview state and skips Kroki (e.g. editor tab is not a `.puml` file). */
  enabled?: boolean;
  debounceMs?: number;
};

export type PlantUmlPreviewState = {
  previewUrl: string | null;
  lastBlob: Blob | null;
  loading: boolean;
  error: string | null;
};

/**
 * Debounced PlantUML → PNG preview via Kroki. Revokes object URLs on unmount and when the preview updates.
 */
export function usePlantUmlPreview(
  source: string,
  { enabled = true, debounceMs = DEFAULT_DEBOUNCE_MS }: UsePlantUmlPreviewOptions = {},
): PlantUmlPreviewState {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      const u = previewUrlRef.current;
      if (u) URL.revokeObjectURL(u);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setLastBlob(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const trimmed = source.trim();
      if (!trimmed) {
        setError(null);
        setLoading(false);
        setLastBlob(null);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        return;
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      setError(null);

      void (async () => {
        try {
          const blob = await fetchPlantUmlPngBlob(source, ac.signal);
          if (ac.signal.aborted) return;
          setLastBlob(blob);
          setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(blob);
          });
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setError(e instanceof Error ? e.message : "Failed to render diagram");
          setLastBlob(null);
          setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
        } finally {
          if (!ac.signal.aborted) setLoading(false);
        }
      })();
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = null;
      abortRef.current?.abort();
      setLoading(false);
    };
  }, [source, enabled, debounceMs]);

  return { previewUrl, lastBlob, loading, error };
}
