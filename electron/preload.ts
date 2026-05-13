import { contextBridge } from "electron";
import { buildElectronApi } from "./preload/buildElectronApi.ts";

contextBridge.exposeInMainWorld("electronApi", buildElectronApi());
