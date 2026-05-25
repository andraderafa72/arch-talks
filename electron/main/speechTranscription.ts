import { app } from "electron";
import path from "node:path";
import { env, pipeline } from "@xenova/transformers";
import type { UiLocale } from "../../src/renderer/types.ts";

/**
 * Local Whisper models (ONNX via @xenova/transformers).
 *
 * **"~Download"** = approximate size of ONNX weight files written to disk under
 * `{userData}/transformers-cache` (Hugging Face cache). Downloaded once per model.
 *
 * **Runtime RAM** is separate and usually **larger** while the model is loaded in
 * the Electron main process (often ~0.5–1.5 GB for base/small). `whisper-small`
 * and `whisper-medium` can crash Electron (SIGTRAP/OOM) on machines with limited RAM.
 *
 * | Model ID              | ~Disk cache | Quality | Speed   |
 * |-----------------------|-------------|---------|---------|
 * | Xenova/whisper-medium | ~750 MB     | Best    | Slow    |
 * | Xenova/whisper-small  | ~150 MB     | Good    | Medium  |
 * | Xenova/whisper-base   | ~75 MB      | OK      | Fast    | ← default
 * | Xenova/whisper-tiny   | ~40 MB      | Poor    | Fastest |
 *
 * Override with env `SPEECH_MODEL_ID`. After changing models, clear `transformers-cache`
 * or pick a new id so old weights are not reused.
 */
export const DEFAULT_SPEECH_MODEL_ID = "Xenova/whisper-base";

let transcriberPromise: ReturnType<typeof createTranscriber> | null = null;
let loadedModelId: string | null = null;

function resolveSpeechModelId(): string {
  const fromEnv = process.env.SPEECH_MODEL_ID?.trim();
  return fromEnv || DEFAULT_SPEECH_MODEL_ID;
}

async function createTranscriber(modelId: string) {
  env.cacheDir = path.join(app.getPath("userData"), "transformers-cache");
  env.allowLocalModels = false;
  return pipeline("automatic-speech-recognition", modelId);
}

function whisperLanguage(locale: UiLocale): string {
  return locale === "pt" ? "portuguese" : "english";
}

async function getTranscriber() {
  const modelId = resolveSpeechModelId();
  if (!transcriberPromise || loadedModelId !== modelId) {
    transcriberPromise = createTranscriber(modelId).catch((error: unknown) => {
      transcriberPromise = null;
      loadedModelId = null;
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to load speech model "${modelId}". Try SPEECH_MODEL_ID=Xenova/whisper-base or free disk/RAM. ${message}`,
      );
    });
    loadedModelId = modelId;
  }
  return transcriberPromise;
}

export function getActiveSpeechModelId(): string {
  return resolveSpeechModelId();
}

export async function ensureSpeechModelLoaded(): Promise<void> {
  await getTranscriber();
}

export async function transcribePcm(
  samples: Float32Array,
  sampleRate: number,
  locale: UiLocale,
): Promise<string> {
  const transcriber = await getTranscriber();
  const result = await transcriber(samples, {
    sampling_rate: sampleRate,
    language: whisperLanguage(locale),
    task: "transcribe",
    temperature: 0,
  } as Parameters<typeof transcriber>[1]);
  const text =
    typeof result === "object" && result !== null && "text" in result
      ? String((result as { text: string }).text)
      : "";
  return text.trim();
}
