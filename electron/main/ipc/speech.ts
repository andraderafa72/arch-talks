import { ipcMain } from "electron";
import { ensureSpeechModelLoaded, transcribePcm } from "../speechTranscription.ts";
import type { UiLocale } from "../../../src/renderer/types.ts";

const SAMPLE_RATE = 16_000;

export function registerSpeechIpc(): void {
  ipcMain.handle("speech:ensureModel", async () => {
    await ensureSpeechModelLoaded();
    return { ok: true as const };
  });

  ipcMain.handle("speech:transcribeChunk", async (_event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid speech:transcribeChunk payload");
    }
    const { samples, sampleRate, locale } = payload as {
      samples?: ArrayBuffer;
      sampleRate?: number;
      locale?: UiLocale;
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
    const text = await transcribePcm(floatSamples, rate, lang);
    return { text };
  });
}
