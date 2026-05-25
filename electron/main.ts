import { app, BrowserWindow, session } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { removeLegacyPersistenceLayout } from "./architectureFileIo.ts";
import { attachWindowChromeListeners, registerWindowControlsIpc } from "./main/ipc/windowControls.ts";
import { registerAllIpc } from "./main/registerAllIpc.ts";
import { shutdownAiRuntime, tryBeginAiRuntimeShutdown } from "./main/localAiRuntime.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

const devPreloadPath = path.resolve(__dirname, "../dist-electron/preload.cjs");
const preloadPath = isDev
  ? (existsSync(devPreloadPath) ? devPreloadPath : path.join(__dirname, "preload.ts"))
  : path.join(__dirname, "preload.cjs");

registerAllIpc();
registerWindowControlsIpc();

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    frame: false,
    backgroundColor: "#fefefe",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  attachWindowChromeListeners(win);

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    void win.loadURL(devServerUrl);
  } else {
    void win.loadFile(path.resolve(__dirname, "../dist/index.html"));
  }
};

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "media");
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === "media";
  });

  void removeLegacyPersistenceLayout();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", (event) => {
  if (!tryBeginAiRuntimeShutdown()) return;
  event.preventDefault();
  void shutdownAiRuntime()
    .catch((error: unknown) => {
      console.error("Failed to shutdown AI runtime", error);
    })
    .finally(() => {
      app.quit();
    });
});
