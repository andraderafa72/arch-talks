import { useCallback, useEffect, useRef, useState } from "react";
import { voiceInputStrings } from "@/lib/uiCopy";
import { useEditorStore } from "@/state/store";
import type { ChatSystemTone, UiLocale } from "@/types";

const TARGET_SAMPLE_RATE = 16_000;
/** Longer chunks give Whisper more context (tiny 2s clips hurt accuracy). */
const CHUNK_SECONDS = 6;
const CHUNK_SAMPLES = TARGET_SAMPLE_RATE * CHUNK_SECONDS;

export type UseVoiceInputOptions = {
  locale: UiLocale;
  onSystemMessage?: (message: string, tone?: ChatSystemTone) => void;
  onFinalTranscript: (text: string) => void;
};

function isVoiceInputAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.electronApi?.speechTranscribeChunk)
  );
}

export function useVoiceInput({
  locale,
  onSystemMessage,
  onFinalTranscript,
}: UseVoiceInputOptions) {
  const strings = voiceInputStrings(locale);
  const speechModelId = useEditorStore((s) => s.speechModelId);

  const [isListening, setIsListening] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [pendingChunks, setPendingChunks] = useState(0);

  const onFinalTranscriptRef = useRef(onFinalTranscript);
  const onSystemMessageRef = useRef(onSystemMessage);
  const stringsRef = useRef(strings);
  const speechModelIdRef = useRef(speechModelId);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sampleBufferRef = useRef<number[]>([]);
  const transcribeChainRef = useRef(Promise.resolve());
  const listeningRef = useRef(false);

  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
    onSystemMessageRef.current = onSystemMessage;
    stringsRef.current = strings;
    speechModelIdRef.current = speechModelId;
  }, [onFinalTranscript, onSystemMessage, strings, speechModelId]);

  const isTranscribing = pendingChunks > 0;
  const hasVoiceInput = isVoiceInputAvailable();

  const releaseAudio = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    sampleBufferRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      listeningRef.current = false;
      releaseAudio();
    };
  }, [releaseAudio]);

  const enqueueTranscription = useCallback(
    (samples: Float32Array) => {
      const api = window.electronApi;
      if (!api?.speechTranscribeChunk || samples.length === 0) return;

      transcribeChainRef.current = transcribeChainRef.current
        .then(async () => {
          setPendingChunks((count) => count + 1);
          try {
            const modelId = speechModelIdRef.current;
            const { text } = await api.speechTranscribeChunk!({
              samples: new Float32Array(samples).buffer,
              sampleRate: TARGET_SAMPLE_RATE,
              locale,
              modelId,
            });
            if (text && listeningRef.current) {
              onFinalTranscriptRef.current(text);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            onSystemMessageRef.current?.(
              `${stringsRef.current.transcriptionFailed}: ${message}`,
              "error",
            );
            listeningRef.current = false;
            setIsListening(false);
            releaseAudio();
          } finally {
            setPendingChunks((count) => Math.max(0, count - 1));
            setIsModelLoading(false);
          }
        })
        .catch(() => undefined);
    },
    [locale, releaseAudio],
  );

  const flushSamples = useCallback(
    (force: boolean) => {
      const buffer = sampleBufferRef.current;
      while (buffer.length >= CHUNK_SAMPLES) {
        const chunk = buffer.splice(0, CHUNK_SAMPLES);
        enqueueTranscription(new Float32Array(chunk));
      }
      if (force && buffer.length > 0) {
        const tail = buffer.splice(0, buffer.length);
        enqueueTranscription(new Float32Array(tail));
      }
    },
    [enqueueTranscription],
  );

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    flushSamples(true);
    releaseAudio();
    setIsListening(false);
  }, [flushSamples, releaseAudio]);

  const toggleVoiceInput = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }

    const api = window.electronApi;
    if (!api?.speechTranscribeChunk) {
      onSystemMessageRef.current?.(stringsRef.current.unsupported, "warning");
      return;
    }

    void (async () => {
      try {
        setIsModelLoading(true);
        const modelId = speechModelIdRef.current;
        if (api.speechSetModelId) {
          await api.speechSetModelId(modelId);
        }
        if (api.speechEnsureModel) {
          await api.speechEnsureModel({ modelId });
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (event) => {
          if (!listeningRef.current) return;
          const channel = event.inputBuffer.getChannelData(0);
          const buffer = sampleBufferRef.current;
          for (let i = 0; i < channel.length; i++) {
            buffer.push(channel[i] ?? 0);
          }
          flushSamples(false);
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        streamRef.current = stream;
        audioContextRef.current = audioContext;
        processorRef.current = processor;
        listeningRef.current = true;
        setIsListening(true);
        setIsModelLoading(false);
      } catch (error) {
        setIsModelLoading(false);
        setIsListening(false);
        listeningRef.current = false;
        releaseAudio();
        const name = error instanceof Error ? error.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          onSystemMessageRef.current?.(stringsRef.current.micDenied, "error");
        } else {
          const message = error instanceof Error ? error.message : String(error);
          onSystemMessageRef.current?.(
            `${stringsRef.current.transcriptionFailed}: ${message}`,
            "error",
          );
        }
      }
    })();
  }, [isListening, stopListening, flushSamples, releaseAudio]);

  return {
    isListening,
    interimTranscript: "",
    isTranscribing,
    isModelLoading,
    hasVoiceInput,
    stopListening,
    clearInterimTranscript: () => undefined,
    toggleVoiceInput,
    strings,
  };
}
