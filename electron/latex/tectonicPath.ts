import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function platformArchDir(): string {
  return `${process.platform}-${process.arch}`;
}

function binaryName(): string {
  return process.platform === "win32" ? "tectonic.exe" : "tectonic";
}

/** Bundled Tectonic next to compiled main (dist-electron) or under app resources. */
export function resolveTectonicBinary(): string | null {
  const override = process.env.TECTONIC_PATH?.trim();
  if (override) {
    return fs.existsSync(override) ? override : null;
  }

  const name = binaryName();
  const sub = path.join(platformArchDir(), name);

  if (app.isPackaged) {
    const packaged = path.join(process.resourcesPath, "tectonic", sub);
    if (fs.existsSync(packaged)) {
      return packaged;
    }
  }

  const fromApp = path.join(app.getAppPath(), "resources", "tectonic", sub);
  if (fs.existsSync(fromApp)) {
    return fromApp;
  }

  const fromDist = path.join(__dirname, "..", "resources", "tectonic", sub);
  if (fs.existsSync(fromDist)) {
    return fromDist;
  }

  return null;
}
