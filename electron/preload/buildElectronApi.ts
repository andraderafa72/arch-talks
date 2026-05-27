import type { ElectronApi } from "../../src/renderer/types/electron-api.ts";
import { exposeArchitectureApis } from "./exposeArchitecture.ts";
import { exposeLatexApi } from "./exposeLatex.ts";
import { exposeLocalAiApis } from "./exposeLocalAi.ts";
import { exposeShellAndFilesApis } from "./exposeShellAndFiles.ts";

import { exposeUserPreferencesApis } from "./exposeUserPreferences.ts";
import { exposeVaultApis } from "./exposeVault.ts";
import { exposeVaultSkillsApis } from "./exposeVaultSkills.ts";
import { exposeWindowControlsApis } from "./exposeWindowControls.ts";
import { exposeIntegrationsApi } from "./exposeIntegrations.ts";
import { exposeSpeechApis } from "./exposeSpeech.ts";
import { exposeDailyReportApis } from "./exposeDailyReport.ts";

export function buildElectronApi(): ElectronApi {
  return {
    platform: process.platform,
    isFramelessShell: true,
    ...exposeSpeechApis(),
    ...exposeLatexApi(),
    ...exposeShellAndFilesApis(),
    ...exposeArchitectureApis(),
    ...exposeLocalAiApis(),
    ...exposeVaultApis(),
    ...exposeVaultSkillsApis(),
    ...exposeWindowControlsApis(),
    ...exposeUserPreferencesApis(),
    ...exposeIntegrationsApi(),
    ...exposeDailyReportApis(),
  };
}
