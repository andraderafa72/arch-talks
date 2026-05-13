import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const MAX_ENTRIES = 48;
const MAX_CACHE_BYTES = 120 * 1024 * 1024;

function manifestHash(mainFile: string, files: Record<string, string>): string {
  const keys = Object.keys(files).sort();
  const h = createHash("sha256");
  h.update(`main:${mainFile}\n`);
  for (const k of keys) {
    h.update(`${k}\n`);
    h.update(files[k]!);
    h.update("\n");
  }
  return h.digest("hex");
}

type CacheEntry = { path: string; size: number };

export class LatexPdfCache {
  private order: string[] = [];
  private map = new Map<string, CacheEntry>();
  private readonly cacheDir: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
  }

  private async evictIfNeeded(): Promise<void> {
    let total = 0;
    for (const e of this.map.values()) {
      total += e.size;
    }
    while ((this.order.length > MAX_ENTRIES || total > MAX_CACHE_BYTES) && this.order.length > 0) {
      const k = this.order.shift();
      if (!k) {
        break;
      }
      const ent = this.map.get(k);
      if (ent) {
        await fs.rm(ent.path, { force: true }).catch(() => {});
        total -= ent.size;
        this.map.delete(k);
      }
    }
  }

  async get(mainFile: string, files: Record<string, string>): Promise<string | null> {
    const key = manifestHash(mainFile, files);
    const hit = this.map.get(key);
    if (!hit) {
      return null;
    }
    try {
      await fs.access(hit.path);
      this.order = this.order.filter((x) => x !== key);
      this.order.push(key);
      return hit.path;
    } catch {
      this.map.delete(key);
      this.order = this.order.filter((x) => x !== key);
      return null;
    }
  }

  async set(mainFile: string, files: Record<string, string>, pdfSourcePath: string): Promise<string> {
    await fs.mkdir(this.cacheDir, { recursive: true });
    const key = manifestHash(mainFile, files);
    const dest = path.join(this.cacheDir, `${key}.pdf`);
    await fs.copyFile(pdfSourcePath, dest);
    const stat = await fs.stat(dest);
    if (this.map.has(key)) {
      const prev = this.map.get(key)!;
      await fs.rm(prev.path, { force: true }).catch(() => {});
      this.order = this.order.filter((x) => x !== key);
    }
    this.map.set(key, { path: dest, size: stat.size });
    this.order.push(key);
    await this.evictIfNeeded();
    return dest;
  }
}
