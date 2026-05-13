import { app, dialog, ipcMain, shell } from "electron";

export function registerShellAndFilesIpc(): void {
  ipcMain.handle("shell:openPath", (_evt, targetPath: unknown) => {
    if (typeof targetPath !== "string" || !targetPath) {
      return { ok: false, error: "Invalid path" };
    }
    const resolved = path.resolve(targetPath);
    const base = path.resolve(app.getPath("userData"));
    const rel = path.relative(base, resolved);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      return { ok: false, error: "Path must be under application userData" };
    }
    void shell.openPath(resolved);
    return { ok: true };
  });

  /** jsPDF/FileSaver often does nothing in Electron renderer; save via dialog + fs. */
  ipcMain.handle("pdf:saveWithDialog", async (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object") {
      return { ok: false as const, error: "Invalid payload" };
    }
    const { defaultFilename, data } = payload as { defaultFilename: string; data: ArrayBuffer };
    if (!(data instanceof ArrayBuffer) || typeof defaultFilename !== "string") {
      return { ok: false as const, error: "Invalid PDF payload" };
    }
    const result = await dialog.showSaveDialog({
      defaultPath: defaultFilename,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (result.canceled || !result.filePath) {
      return { ok: false as const, canceled: true };
    }
    await fs.writeFile(result.filePath, Buffer.from(data));
    return { ok: true as const, path: result.filePath };
  });

  ipcMain.handle("pdf:printCurrentWebContents", async (evt) => {
    const pdfBuffer = await evt.sender.printToPDF({
      pageSize: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margins: { marginType: "none" },
    });
    const data = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength,
    );
    return { ok: true as const, data };
  });

  ipcMain.handle("file:saveTextWithDialog", async (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object") {
      return { ok: false as const, error: "Invalid payload" };
    }
    const { content, defaultFilename, existingPath } = payload as {
      content: string;
      defaultFilename: string;
      existingPath?: string;
    };
    if (typeof content !== "string" || typeof defaultFilename !== "string") {
      return { ok: false as const, error: "Invalid text payload" };
    }

    if (typeof existingPath === "string" && existingPath.trim()) {
      await fs.writeFile(existingPath, content, "utf8");
      return { ok: true as const, path: existingPath };
    }

    const result = await dialog.showSaveDialog({
      defaultPath: defaultFilename,
      filters: [{ name: "Text", extensions: ["md", "markdown", "txt", "puml", "plantuml", "uml"] }],
    });
    if (result.canceled || !result.filePath) {
      return { ok: false as const, canceled: true };
    }
    await fs.writeFile(result.filePath, content, "utf8");
    return { ok: true as const, path: result.filePath };
  });

  ipcMain.handle("file:openTextWithDialog", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Text", extensions: ["md", "markdown", "txt", "puml", "plantuml", "uml"] }],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false as const, canceled: true };
    }
    const filePath = result.filePaths[0]!;
    const content = await fs.readFile(filePath, "utf8");
    return { ok: true as const, path: filePath, content };
  });
}
