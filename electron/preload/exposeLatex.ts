import { ipcRenderer } from "electron";
import type { LatexRenderRequest, LatexRenderResult } from "../latex/types.ts";
import type { ElectronApi } from "../../src/renderer/types/electron-api.ts";

export function exposeLatexApi(): Pick<ElectronApi, "renderLatex"> {
  return {
    renderLatex: (req: LatexRenderRequest): Promise<LatexRenderResult> => ipcRenderer.invoke("latex:render", req),
  };
}
