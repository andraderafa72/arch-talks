#!/usr/bin/env node
/**
 * Downloads the latest Tectonic release asset for the current OS/arch into
 * resources/tectonic/<platform>-<arch>/tectonic(.exe)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outRoot = path.join(root, "resources", "tectonic");

const PLATFORM_TRIPLE = {
  "linux-x64": "x86_64-unknown-linux-gnu",
  "linux-arm64": "aarch64-unknown-linux-gnu",
  "darwin-x64": "x86_64-apple-darwin",
  "darwin-arm64": "aarch64-apple-darwin",
  "win32-x64": "x86_64-pc-windows-msvc",
};

const key = `${process.platform}-${process.arch}`;
const triple = PLATFORM_TRIPLE[key];
if (!triple) {
  console.error(`Unsupported platform/arch: ${key}`);
  process.exit(1);
}

const binName = process.platform === "win32" ? "tectonic.exe" : "tectonic";
const destDir = path.join(outRoot, key);
const destBin = path.join(destDir, binName);

async function findBinary(dir, name) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isFile() && e.name === name) {
      return p;
    }
    if (e.isDirectory()) {
      const nested = await findBinary(p, name);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}

async function main() {
  const res = await fetch("https://api.github.com/repos/tectonic-typesetting/tectonic/releases/latest", {
    headers: { "User-Agent": "rag-talks-frontend-TECTONIC-DOWNLOAD" },
  });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }
  const data = await res.json();
  const asset = (data.assets ?? []).find(
    (a) => a.name.includes(triple) && (a.name.endsWith(".tar.gz") || a.name.endsWith(".zip")),
  );
  if (!asset) {
    throw new Error(`No release asset matching ${triple} in ${data.tag_name ?? "latest"}`);
  }

  await fs.mkdir(destDir, { recursive: true });
  const tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), "tectonic-dl-"));
  const archivePath = path.join(tmpBase, asset.name);
  const dl = await fetch(asset.browser_download_url, {
    headers: { "User-Agent": "rag-talks-frontend-TECTONIC-DOWNLOAD" },
  });
  if (!dl.ok) {
    throw new Error(`Download failed: ${dl.status}`);
  }
  const buf = Buffer.from(await dl.arrayBuffer());
  await fs.writeFile(archivePath, buf);

  const extractDir = path.join(tmpBase, "extract");
  await fs.mkdir(extractDir, { recursive: true });

  const isGz = asset.name.endsWith(".tar.gz");
  const tarArgs = isGz ? ["-xzf", archivePath, "-C", extractDir] : ["-xf", archivePath, "-C", extractDir];
  const r = spawnSync("tar", tarArgs, { stdio: "inherit" });
  if (r.error || r.status !== 0) {
    throw new Error(`Failed to extract archive (tar exit ${r.status ?? "?"})`);
  }

  const found = await findBinary(extractDir, binName);
  if (!found) {
    throw new Error(`Could not find ${binName} inside archive`);
  }

  await fs.copyFile(found, destBin);
  if (process.platform !== "win32") {
    await fs.chmod(destBin, 0o755);
  }

  await fs.rm(tmpBase, { recursive: true, force: true });
  console.log(`Tectonic installed to ${destBin}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
