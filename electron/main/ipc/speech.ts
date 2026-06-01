import { ipcMain } from "electron";
import {
  ensureSpeechModelLoaded,
  setSpeechModelId,
  transcribePcm,
} from "../speechTranscription.ts";
import type { UiLocale } from "../../../src/renderer/types.ts";

const SAMPLE_RATE = 16_000;

export function registerSpeechIpc(): void {
  ipcMain.handle("speech:setModelId", async (_event, payload: unknown) => {
    if (typeof payload !== "string" || !payload.trim()) {
      throw new Error("Invalid speech:setModelId payload");
    }
    setSpeechModelId(payload.trim());
    return { ok: true as const };
  });

  ipcMain.handle("speech:ensureModel", async (_event, payload: unknown) => {
    const modelId =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as { modelId?: string }).modelId
        : undefined;
    await ensureSpeechModelLoaded(modelId);
    return { ok: true as const };
  });

  ipcMain.handle("speech:transcribeChunk", async (_event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid speech:transcribeChunk payload");
    }
    const { samples, sampleRate, locale, modelId } = payload as {
      samples?: ArrayBuffer;
      sampleRate?: number;
      locale?: UiLocale;
      modelId?: string;
    };
    if (!(samples instanceof ArrayBuffer)) {
      throw new Error("Invalid speech samples");
    }
    const rate = typeof sampleRate === "number" && sampleRate > 0 ? sampleRate : SAMPLE_RATE;
    const lang: UiLocale = locale === "pt" ? "pt" : "en";
    const floatSamples = new Float32Array(samples);
    if (floatSamples.length === 0) {
      return { text: "" };
    }
    const text = await transcribePcm(floatSamples, rate, lang, modelId);
    return { text };
  });
}
