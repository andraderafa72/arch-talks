import { ipcMain } from "electron";
import {
  deleteUserVaultSkill,
  listVaultConsumptionSkills,
  saveUserVaultSkill,
} from "../../vault/vaultConsumptionSkillsIo.ts";

export function registerVaultSkillsIpc(): void {
  ipcMain.handle("vaultSkills:list", () => listVaultConsumptionSkills());

  ipcMain.handle("vaultSkills:save", (_event, payload: unknown) => {
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
    const { id, name, description, content } = payload as {
      id: string;
      name: string;
      description?: string;
      content: string;
    };
    if (typeof id !== "string" || typeof name !== "string" || typeof content !== "string") {
      throw new Error("Invalid vault skill payload");
    }
    return saveUserVaultSkill({
      id,
      name,
      description: typeof description === "string" ? description : "",
      content,
    });
  });

  ipcMain.handle("vaultSkills:delete", (_event, id: unknown) => {
    if (typeof id !== "string" || !id) throw new Error("Invalid skill id");
    return deleteUserVaultSkill(id);
  });
}
