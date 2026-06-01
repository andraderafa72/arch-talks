import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Mic, MicOff, SendHorizontal, Square } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChatThinkingIndicator } from "@/components/chat/ChatThinkingIndicator";
import { MentionSuggestionsPopover } from "@/components/chat/MentionSuggestionsPopover";
import type { ChatSystemTone } from "@/types";
import type { LocalAiModelOption, LocalAiProviderOption, LocalAiSelection } from "@/types/electron-api";
import {
  CHAT_AI_CONTROLS_SELECT_CLASS,
  CHAT_AI_CONTROLS_TEXTAREA_CLASS,
} from "@/lib/chatThemeClasses";
import { adjustChatTextareaHeight, handleChatTextareaKeyDown } from "@/lib/chatTextarea";
import { useMentionAutocomplete, type MentionAutocompleteConfig } from "@/hooks/useMentionAutocomplete";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useEditorStore } from "@/state/store";
import type { MentionSuggestion } from "@/lib/mentionTokens";

export type ChatAiControlsProps = {
  selection?: LocalAiSelection | undefined;
  onSelectionChange?: (selection: LocalAiSelection | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  submitDisabled?: boolean;
  onSubmit: (prompt: string) => Promise<void> | void;
  onStop?: () => void | Promise<void>;
  onSystemMessage?: (message: string, tone?: ChatSystemTone) => void;
  onLoadingChange?: (loading: boolean) => void;
  mentionConfig?: MentionAutocompleteConfig;
  onProvidersLoaded?: (providers: LocalAiProviderOption[]) => void;
};

type LoadState =
  | { status: "idle" }
  | { status: "loaded"; providers: LocalAiProviderOption[]; models: LocalAiModelOption[] }
  | { status: "no-bridge" }
  | { status: "empty" };

function resolveElectronApi(): Window["electronApi"] | undefined {
  return typeof window !== "undefined" ? window.electronApi : undefined;
}

function appendTranscript(current: string, segment: string): string {
  const trimmed = segment.trim();
  if (!trimmed) return current;
  return current ? `${current} ${trimmed}` : trimmed;
}

export function ChatAiControls({
  selection,
  onSelectionChange,
  placeholder = "Describe requested patch...",
  disabled,
  submitDisabled,
  onSubmit,
  onStop,
  onSystemMessage,
  onLoadingChange,
  mentionConfig,
  onProvidersLoaded,
}: ChatAiControlsProps) {
  const locale = useEditorStore((s) => s.locale);
  const stopLabel = locale === "pt" ? "Interromper geração" : "Stop generating";
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [caret, setCaret] = useState(0);
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const mentionAutocomplete = useMentionAutocomplete(prompt, caret, mentionConfig ?? { enabled: false, workspacePaths: [], referencePaths: [] });

  useEffect(() => {
    setMentionActiveIndex(0);
  }, [mentionAutocomplete.suggestions.length, mentionAutocomplete.mentionStart]);

  const handleFinalTranscript = useCallback((text: string) => {
    setPrompt((current) => appendTranscript(current, text));
  }, []);

  const {
    isListening,
    interimTranscript,
    isTranscribing,
    isModelLoading,
    hasVoiceInput,
    stopListening,
    clearInterimTranscript,
    toggleVoiceInput,
    strings: voiceStrings,
  } = useVoiceInput({
    locale,
    onSystemMessage,
    onFinalTranscript: handleFinalTranscript,
  });

  const displayValue =
    interimTranscript.length > 0
      ? prompt
        ? `${prompt} ${interimTranscript}`
        : interimTranscript
      : prompt;

  const hasSendableText = Boolean(prompt.trim() || interimTranscript.trim());

  const [loadState, setLoadState] = useState<LoadState>(() => {
    const api = resolveElectronApi();
    return api?.aiListLocalOptions ? { status: "idle" } : { status: "no-bridge" };
  });

  useEffect(() => {
    if (loadState.status !== "idle") return;
    const api = resolveElectronApi();
    if (!api?.aiListLocalOptions) return;
    void api
      .aiListLocalOptions()
      .then((opts) => {
        if (opts.providers.length === 0) {
          setLoadState({ status: "empty" });
          return;
        }
        setLoadState({ status: "loaded", providers: opts.providers, models: opts.models });
        onProvidersLoaded?.(opts.providers);
        if (onSelectionChange && !selection?.provider) {
          const first = opts.providers[0];
          if (first) {
            const firstModel = opts.models.find((m) => m.provider === first.provider);
            onSelectionChange({ provider: first.provider, modelId: firstModel?.id });
          }
        }
      })
      .catch(() => {
        setLoadState({ status: "empty" });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loadState.status !== "loaded" || !onSelectionChange) return;
    if (selection?.provider) {
      const exists = loadState.providers.some((p) => p.provider === selection.provider);
      if (!exists) {
        const first = loadState.providers[0];
        if (first) {
          const firstModel = loadState.models.find((m) => m.provider === first.provider);
          onSelectionChange({ provider: first.provider, modelId: firstModel?.id });
        }
      }
      return;
    }
    const first = loadState.providers[0];
    if (first) {
      const firstModel = loadState.models.find((m) => m.provider === first.provider);
      onSelectionChange({ provider: first.provider, modelId: firstModel?.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadState]);

  useLayoutEffect(() => {
    adjustChatTextareaHeight(textareaRef.current, 1, 10);
  }, [displayValue]);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  const handleSubmit = useCallback(
    async (value?: string) => {
      const text = (value ?? displayValue).trim();
      if (!text || loading || disabled || submitDisabled) return;
      stopListening();
      setLoading(true);
      setPrompt("");
      try {
        await onSubmit(text);
      } finally {
        setLoading(false);
      }
    },
    [displayValue, loading, disabled, submitDisabled, onSubmit, stopListening],
  );

  const handleStop = useCallback(async () => {
    if (!loading || !onStop) return;
    await onStop();
  }, [loading, onStop]);

  const isDisabled = disabled || loading;
  const canStop = loading && Boolean(onStop);

  const activeProvider =
    loadState.status === "loaded"
      ? (selection?.provider ?? loadState.providers[0]?.provider ?? "")
      : "";
  const modelsForProvider =
    loadState.status === "loaded"
      ? loadState.models.filter((m) => m.provider === activeProvider)
      : [];
  const activeModelId =
    loadState.status === "loaded"
      ? (selection?.modelId ?? modelsForProvider[0]?.id)
      : undefined;

  function handleProviderChange(provider: string) {
    if (!onSelectionChange || loadState.status !== "loaded") return;
    const first = loadState.models.find((m) => m.provider === provider);
    onSelectionChange({ provider, modelId: first?.id });
  }

  function handleModelChange(modelId: string) {
    if (!onSelectionChange) return;
    onSelectionChange({ provider: activeProvider, modelId });
  }

  function handlePromptChange(nextValue: string, nextCaret?: number) {
    setPrompt(nextValue);
    if (typeof nextCaret === "number") setCaret(nextCaret);
    else setCaret(nextValue.length);
    if (interimTranscript.length > 0) {
      clearInterimTranscript();
    }
  }

  const applyMention = useCallback(
    (suggestion: MentionSuggestion) => {
      const el = textareaRef.current;
      const currentCaret = el?.selectionStart ?? caret;
      const { value, caret: nextCaret } = mentionAutocomplete.applySuggestion(
        suggestion,
        prompt,
        currentCaret,
      );
      handlePromptChange(value, nextCaret);
      requestAnimationFrame(() => {
        if (!textareaRef.current) return;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextCaret, nextCaret);
      });
    },
    [caret, mentionAutocomplete, prompt],
  );

  const interimPreview =
    interimTranscript.length > 48
      ? `${interimTranscript.slice(0, 48)}…`
      : interimTranscript;

  return (
    <div className="flex flex-col gap-2">
      {loading ? <ChatThinkingIndicator locale={locale} /> : null}
      <div className="relative">
        <textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={displayValue}
          onChange={(event) => {
            handlePromptChange(event.target.value, event.target.selectionStart);
          }}
          onClick={(event) => setCaret(event.currentTarget.selectionStart)}
          onKeyUp={(event) => setCaret(event.currentTarget.selectionStart)}
          onKeyDown={(event) => {
            if (mentionAutocomplete.isOpen && mentionAutocomplete.suggestions.length > 0) {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setMentionActiveIndex((i) => (i + 1) % mentionAutocomplete.suggestions.length);
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setMentionActiveIndex(
                  (i) =>
                    (i - 1 + mentionAutocomplete.suggestions.length) %
                    mentionAutocomplete.suggestions.length,
                );
                return;
              }
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                const picked = mentionAutocomplete.suggestions[mentionActiveIndex];
                if (picked) applyMention(picked);
                return;
              }
              if (event.key === "Escape") {
                event.preventDefault();
                return;
              }
            }
            handleChatTextareaKeyDown(event, {
              onSubmit: (value) => {
                void handleSubmit(value);
              },
            });
          }}
          rows={1}
          disabled={isDisabled}
          className={CHAT_AI_CONTROLS_TEXTAREA_CLASS}
        />
        <MentionSuggestionsPopover
          open={mentionAutocomplete.isOpen}
          suggestions={mentionAutocomplete.suggestions}
          activeIndex={mentionActiveIndex}
          onSelect={applyMention}
        />
      </div>
      {isListening || isModelLoading ? (
        <div
          className="flex min-w-0 items-center gap-2 text-xs"
          role="status"
          aria-live="polite"
        >
          <span
            className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--ui-chat-control-voice-pulse)]"
            aria-hidden="true"
          />
          <span className="font-medium text-[var(--ui-chat-control-status-fg)]">
            {isModelLoading
              ? voiceStrings.modelLoading
              : isTranscribing
                ? voiceStrings.transcribing
                : voiceStrings.listening}
          </span>
          {isTranscribing && interimPreview ? (
            <span className="min-w-0 truncate italic text-[var(--ui-chat-control-status-fg)]">
              &ldquo;{interimPreview}&rdquo;
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {loadState.status === "loaded" && onSelectionChange ? (
            <>
              <Select
                value={activeProvider}
                disabled={isDisabled || loadState.providers.length <= 1}
                onValueChange={handleProviderChange}
              >
                <SelectTrigger
                  className={CHAT_AI_CONTROLS_SELECT_CLASS}
                  aria-label="Provedor de IA"
                  title="Provedor de IA"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {loadState.providers.map((p) => (
                    <SelectItem key={p.provider} value={p.provider}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {modelsForProvider.length > 0 ? (
                <Select
                  value={activeModelId}
                  disabled={isDisabled || modelsForProvider.length === 0}
                  onValueChange={handleModelChange}
                >
                  <SelectTrigger
                    className={CHAT_AI_CONTROLS_SELECT_CLASS}
                    aria-label="Modelo"
                    title="Modelo"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modelsForProvider.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {hasVoiceInput ? (
            <Button
              type="button"
              size="sm"
              variant={isListening ? "default" : "secondary"}
              disabled={isDisabled}
              onClick={toggleVoiceInput}
              aria-label={isListening ? voiceStrings.stopVoice : voiceStrings.startVoice}
              title={isListening ? voiceStrings.stopVoice : voiceStrings.startVoice}
              className={isListening ? "ring-2 ring-red-400/60" : undefined}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Mic className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          ) : null}
          {canStop ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => void handleStop()}
              aria-label={stopLabel}
              title={stopLabel}
            >
              <Square className="h-4 w-4 fill-current" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={isDisabled || !!submitDisabled || !hasSendableText}
              onClick={() => void handleSubmit()}
              aria-label="Send message"
              title="Send message"
            >
              <SendHorizontal className="h-5 w-5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
