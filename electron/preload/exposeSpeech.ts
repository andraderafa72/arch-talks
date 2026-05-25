import { ipcRenderer } from "electron";
import type { ElectronApi } from "../../src/renderer/types/electron-api.ts";
import type { UiLocale } from "../../src/renderer/types.ts";

export type SpeechTranscribeChunkRequest = {
  samples: ArrayBuffer;
  sampleRate: number;
  locale: UiLocale;
};

export function exposeSpeechApis(): Pick<
  ElectronApi,
  "speechEnsureModel" | "speechTranscribeChunk"
> {
  return {
    speechEnsureModel: (): Promise<{ ok: true }> => ipcRenderer.invoke("speech:ensureModel"),
    speechTranscribeChunk: (req: SpeechTranscribeChunkRequest): Promise<{ text: string }> =>
      ipcRenderer.invoke("speech:transcribeChunk", req),
  };
}
