import { ipcRenderer } from "electron";
import type { ElectronApi } from "../../src/renderer/types/electron-api.ts";

export function exposeVaultSkillsApis(): Pick<
  ElectronApi,
  "vaultSkillsList" | "vaultSkillsSave" | "vaultSkillsDelete"
> {
  return {
    vaultSkillsList: () => ipcRenderer.invoke("vaultSkills:list"),
    vaultSkillsSave: (skill) => ipcRenderer.invoke("vaultSkills:save", skill),
    vaultSkillsDelete: (id) => ipcRenderer.invoke("vaultSkills:delete", id),
  };
}
