import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Mic, MicOff, SendHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { LocalAiModelOption, LocalAiProviderOption, LocalAiSelection } from "@/types/electron-api";
import { adjustChatTextareaHeight, handleChatTextareaKeyDown } from "@/lib/chatTextarea";

export type ChatAiControlsProps = {
  selection?: LocalAiSelection | undefined;
  onSelectionChange?: (selection: LocalAiSelection | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  submitDisabled?: boolean;
  onSubmit: (prompt: string) => Promise<void> | void;
  onSystemMessage?: (message: string) => void;
};

type LoadState =
  | { status: "idle" }
  | { status: "loaded"; providers: LocalAiProviderOption[]; models: LocalAiModelOption[] }
  | { status: "no-bridge" }
  | { status: "empty" };

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: Event) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function resolveElectronApi(): Window["electronApi"] | undefined {
  return typeof window !== "undefined" ? window.electronApi : undefined;
}

export function ChatAiControls({
  selection,
  onSelectionChange,
  placeholder = "Describe requested patch...",
  disabled,
  submitDisabled,
  onSubmit,
  onSystemMessage,
}: ChatAiControlsProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const keepListeningRef = useRef(false);

  const hasSpeechRecognition =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

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
  }, [prompt]);

  useEffect(() => {
    return () => {
      keepListeningRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  const handleSubmit = useCallback(
    async (value?: string) => {
      const text = (value ?? prompt).trim();
      if (!text || loading || disabled || submitDisabled) return;
      setLoading(true);
      setPrompt("");
      try {
        await onSubmit(text);
      } finally {
        setLoading(false);
      }
    },
    [prompt, loading, disabled, submitDisabled, onSubmit],
  );

  const toggleVoiceInput = useCallback(() => {
    if (!hasSpeechRecognition) {
      onSystemMessage?.("Voice input is not supported by this browser.");
      return;
    }

    if (isListening) {
      keepListeningRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognitionApi = (
      window as Window & {
        SpeechRecognition?: SpeechRecognitionCtor;
        webkitSpeechRecognition?: SpeechRecognitionCtor;
      }
    ).SpeechRecognition ??
      (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor })
        .webkitSpeechRecognition;

    if (!SpeechRecognitionApi) return;

    const recognition = new SpeechRecognitionApi();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "pt-BR";
    recognition.onresult = (event: Event) => {
      const speechEvent = event as Event & {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      };
      const latest =
        speechEvent.results[speechEvent.results.length - 1]?.[0]?.transcript?.trim();
      if (!latest) return;
      setPrompt((current) => (current ? `${current} ${latest}` : latest));
    };
    recognition.onerror = () => {
      if (!keepListeningRef.current) {
        setIsListening(false);
        return;
      }
      recognition.stop();
    };
    recognition.onend = () => {
      if (!keepListeningRef.current) {
        setIsListening(false);
        return;
      }
      recognition.start();
    };
    recognitionRef.current = recognition;
    keepListeningRef.current = true;
    recognition.start();
    setIsListening(true);
  }, [hasSpeechRecognition, isListening, onSystemMessage]);

  const isDisabled = disabled || loading;

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

  const selectTriggerClass =
    "w-auto gap-1 border-zinc-200 bg-white text-[12px] text-zinc-700 shadow-none focus:ring-1 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 h-6 min-w-24 px-1.5 py-0";

  function handleProviderChange(provider: string) {
    if (!onSelectionChange || loadState.status !== "loaded") return;
    const first = loadState.models.find((m) => m.provider === provider);
    onSelectionChange({ provider, modelId: first?.id });
  }

  function handleModelChange(modelId: string) {
    if (!onSelectionChange) return;
    onSelectionChange({ provider: activeProvider, modelId });
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) =>
          handleChatTextareaKeyDown(event, {
            onSubmit: (value) => {
              void handleSubmit(value);
            },
          })
        }
        rows={1}
        disabled={isDisabled}
        className="w-full resize-none rounded-md border border-zinc-200 bg-[#fefefe] px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
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
                  className={selectTriggerClass}
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
                    className={selectTriggerClass}
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
          {hasSpeechRecognition ? (
            <Button
              type="button"
              size="sm"
              variant={isListening ? "default" : "secondary"}
              disabled={isDisabled}
              onClick={toggleVoiceInput}
              aria-label={isListening ? "Stop voice input" : "Start voice input"}
              title={isListening ? "Stop voice input" : "Start voice input"}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Mic className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          ) : null}
          <Button
            size="sm"
            disabled={isDisabled || !!submitDisabled || !prompt.trim()}
            onClick={() => void handleSubmit()}
            aria-label="Send message"
            title="Send message"
          >
            <SendHorizontal className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
