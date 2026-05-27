import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildWorkspaceMentionSuggestions,
  type MentionSuggestion,
} from "@/lib/mentionTokens";
import type { SystemDesignReferenceEntry } from "@/types/electron-api";

export type MentionAutocompleteConfig = {
  enabled: boolean;
  workspacePaths: string[];
  referencePaths: string[];
  listReferenceEntries?: (query: string) => Promise<SystemDesignReferenceEntry[]>;
};

function getMentionQuery(value: string, caret: number): { start: number; query: string } | null {
  const before = value.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at < 0) return null;
  const fragment = before.slice(at + 1);
  if (fragment.includes(" ") || fragment.includes("\n")) return null;
  return { start: at, query: fragment };
}

export function useMentionAutocomplete(
  value: string,
  caret: number,
  config: MentionAutocompleteConfig,
) {
  const [referenceSuggestions, setReferenceSuggestions] = useState<MentionSuggestion[]>([]);
  const mention = useMemo(() => getMentionQuery(value, caret), [value, caret]);
  const workspaceSuggestions = useMemo(() => {
    if (!config.enabled || !mention) return [];
    return buildWorkspaceMentionSuggestions(config.workspacePaths, mention.query);
  }, [config.enabled, config.workspacePaths, mention]);

  useEffect(() => {
    if (!config.enabled || !mention || !config.listReferenceEntries || config.referencePaths.length === 0) {
      setReferenceSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void config.listReferenceEntries?.(mention.query).then((entries) => {
        if (cancelled) return;
        setReferenceSuggestions(
          entries.map((e) => ({
            token: `@${e.token}`,
            label: e.label,
            group: e.group,
            isDirectory: e.isDirectory,
          })),
        );
      });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [config.enabled, config.listReferenceEntries, config.referencePaths.length, mention]);

  const suggestions = useMemo(() => {
    const merged = [...workspaceSuggestions, ...referenceSuggestions];
    const seen = new Set<string>();
    return merged.filter((s) => {
      if (seen.has(s.token)) return false;
      seen.add(s.token);
      return true;
    });
  }, [workspaceSuggestions, referenceSuggestions]);

  const applySuggestion = useCallback(
    (suggestion: MentionSuggestion, currentValue: string, currentCaret: number) => {
      const activeMention = getMentionQuery(currentValue, currentCaret);
      if (!activeMention) return { value: currentValue, caret: currentCaret };
      const before = currentValue.slice(0, activeMention.start);
      const after = currentValue.slice(currentCaret);
      const insert = `${suggestion.token} `;
      const nextValue = `${before}${insert}${after}`;
      const nextCaret = before.length + insert.length;
      return { value: nextValue, caret: nextCaret };
    },
    [],
  );

  return {
    isOpen: Boolean(config.enabled && mention && suggestions.length > 0),
    suggestions,
    mentionStart: mention?.start ?? null,
    applySuggestion,
  };
}
