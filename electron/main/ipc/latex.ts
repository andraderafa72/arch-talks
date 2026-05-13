import { ipcMain } from "electron";
import { renderLatex } from "../../latex/renderLatex.ts";

export function registerLatexIpc(): void {
  ipcMain.handle("latex:render", (_evt, payload: unknown) => renderLatex(payload));
}
