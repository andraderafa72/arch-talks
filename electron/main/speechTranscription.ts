import { app } from "electron";
import path from "node:path";
import { env, pipeline } from "@xenova/transformers";
import {
  DEFAULT_SPEECH_MODEL_ID,
  parseSpeechModelId,
} from "../../shared/speechModels.ts";
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
 * Model priority: user preference (IPC) → env `SPEECH_MODEL_ID` → default.
 */
export { DEFAULT_SPEECH_MODEL_ID };

let transcriberPromise: ReturnType<typeof createTranscriber> | null = null;
let loadedModelId: string | null = null;
let userSelectedModelId: string | null = null;

function resolveSpeechModelId(): string {
  if (userSelectedModelId) return userSelectedModelId;
  const fromEnv = process.env.SPEECH_MODEL_ID?.trim();
  if (fromEnv && parseSpeechModelId(fromEnv) === fromEnv) return fromEnv;
  return DEFAULT_SPEECH_MODEL_ID;
}

export function setSpeechModelId(modelId: string): void {
  const normalized = parseSpeechModelId(modelId);
  if (userSelectedModelId === normalized) return;
  userSelectedModelId = normalized;
  if (loadedModelId !== normalized) {
    transcriberPromise = null;
    loadedModelId = null;
  }
}

async function createTranscriber(modelId: string) {
  env.cacheDir = path.join(app.getPath("userData"), "transformers-cache");
  env.allowLocalModels = false;
  return pipeline("automatic-speech-recognition", modelId);
}

function whisperLanguage(locale: UiLocale): string {
  return locale === "pt" ? "portuguese" : "english";
}

async function getTranscriber(modelIdOverride?: string) {
  const modelId = modelIdOverride ? parseSpeechModelId(modelIdOverride) : resolveSpeechModelId();
  if (!transcriberPromise || loadedModelId !== modelId) {
    transcriberPromise = createTranscriber(modelId).catch((error: unknown) => {
      transcriberPromise = null;
      loadedModelId = null;
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to load speech model "${modelId}". Try Xenova/whisper-base or free disk/RAM. ${message}`,
      );
    });
    loadedModelId = modelId;
  }
  return transcriberPromise;
}

export function getActiveSpeechModelId(): string {
  return resolveSpeechModelId();
}

export async function ensureSpeechModelLoaded(modelId?: string): Promise<void> {
  if (modelId) setSpeechModelId(modelId);
  await getTranscriber(modelId);
}

export async function transcribePcm(
  samples: Float32Array,
  sampleRate: number,
  locale: UiLocale,
  modelId?: string,
): Promise<string> {
  if (modelId) setSpeechModelId(modelId);
  const transcriber = await getTranscriber(modelId);
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
