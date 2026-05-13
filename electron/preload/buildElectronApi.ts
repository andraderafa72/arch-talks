import type { ElectronApi } from "../../src/renderer/types/electron-api.ts";
import { exposeArchitectureApis } from "./exposeArchitecture.ts";
import { exposeLatexApi } from "./exposeLatex.ts";
import { exposeLocalAiApis } from "./exposeLocalAi.ts";
import { exposeShellAndFilesApis } from "./exposeShellAndFiles.ts";

export function buildElectronApi(): ElectronApi {
  return {
    platform: process.platform,
    ...exposeLatexApi(),
    ...exposeShellAndFilesApis(),
    ...exposeArchitectureApis(),
    ...exposeLocalAiApis(),
  };
}
