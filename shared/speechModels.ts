/** Shared Whisper model identifiers (renderer + Electron main). */

export const SPEECH_MODEL_IDS = [
  "Xenova/whisper-tiny",
  "Xenova/whisper-base",
  "Xenova/whisper-small",
  "Xenova/whisper-medium",
] as const;

export type SpeechModelId = (typeof SPEECH_MODEL_IDS)[number];

export const DEFAULT_SPEECH_MODEL_ID: SpeechModelId = "Xenova/whisper-base";

export type SpeechModelOption = {
  id: SpeechModelId;
  /** Short hint for UI (size / quality trade-off). */
  hint: string;
};

export const SPEECH_MODEL_OPTIONS: SpeechModelOption[] = [
  { id: "Xenova/whisper-tiny", hint: "~40 MB, fastest, lowest quality" },
  { id: "Xenova/whisper-base", hint: "~75 MB, default" },
  { id: "Xenova/whisper-small", hint: "~150 MB, good quality" },
  { id: "Xenova/whisper-medium", hint: "~750 MB, best quality, heavy RAM" },
];

export function isSpeechModelId(value: string): value is SpeechModelId {
  return (SPEECH_MODEL_IDS as readonly string[]).includes(value);
}

export function parseSpeechModelId(raw: unknown): SpeechModelId {
  if (typeof raw === "string" && isSpeechModelId(raw.trim())) {
    return raw.trim() as SpeechModelId;
  }
  return DEFAULT_SPEECH_MODEL_ID;
}
