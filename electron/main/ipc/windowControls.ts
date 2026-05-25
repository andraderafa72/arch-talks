import { BrowserWindow, ipcMain } from "electron";

function resolveSenderWindow(event: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win && !win.isDestroyed() ? win : null;
}

export function attachWindowChromeListeners(win: BrowserWindow): void {
  const emitMaximized = (maximized: boolean) => {
    if (win.isDestroyed()) return;
    win.webContents.send("window:maximized-changed", maximized);
  };
  win.on("maximize", () => emitMaximized(true));
  win.on("unmaximize", () => emitMaximized(false));
}

export function registerWindowControlsIpc(): void {
  ipcMain.handle("window:minimize", (event) => {
    resolveSenderWindow(event)?.minimize();
  });

  ipcMain.handle("window:toggleMaximize", (event) => {
    const win = resolveSenderWindow(event);
    if (!win) return false;
    if (win.isMaximized()) {
      win.unmaximize();
      return false;
    }
    win.maximize();
    return true;
  });

  ipcMain.handle("window:close", (event) => {
    resolveSenderWindow(event)?.close();
  });

  ipcMain.handle("window:isMaximized", (event) => {
    return resolveSenderWindow(event)?.isMaximized() ?? false;
  });
}
