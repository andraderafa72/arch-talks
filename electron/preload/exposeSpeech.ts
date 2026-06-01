import { ipcRenderer } from "electron";
import type { ElectronApi } from "../../src/renderer/types/electron-api.ts";
import type { UiLocale } from "../../src/renderer/types.ts";

export type SpeechTranscribeChunkRequest = {
  samples: ArrayBuffer;
  sampleRate: number;
  locale: UiLocale;
  modelId?: string;
};

export type SpeechEnsureModelRequest = {
  modelId?: string;
};

export function exposeSpeechApis(): Pick<
  ElectronApi,
  "speechSetModelId" | "speechEnsureModel" | "speechTranscribeChunk"
> {
  return {
    speechSetModelId: (modelId: string): Promise<{ ok: true }> =>
      ipcRenderer.invoke("speech:setModelId", modelId),
    speechEnsureModel: (req?: SpeechEnsureModelRequest): Promise<{ ok: true }> =>
      ipcRenderer.invoke("speech:ensureModel", req ?? {}),
    speechTranscribeChunk: (req: SpeechTranscribeChunkRequest): Promise<{ text: string }> =>
      ipcRenderer.invoke("speech:transcribeChunk", req),
  };
}
