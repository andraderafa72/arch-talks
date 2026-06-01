import fs from "node:fs/promises";
import path from "node:path";

export const ARCH_CONFIG_FILENAME = "arch-config.json";

export type ArchSystemDesignConfig = {
  version: 1;
  kind: "system_design";
  name: string;
  createdAt: string;
  documentId: string;
  rootPath: string;
};

export function buildArchSystemDesignConfig(options: {
  name: string;
  documentId: string;
  rootPath: string;
  createdAt?: string;
}): ArchSystemDesignConfig {
  return {
    version: 1,
    kind: "system_design",
    name: options.name.trim(),
    createdAt: options.createdAt ?? new Date().toISOString(),
    documentId: options.documentId,
    rootPath: options.rootPath,
  };
}

export async function writeArchSystemDesignConfig(
  rootPath: string,
  config: ArchSystemDesignConfig,
): Promise<void> {
  const target = path.join(rootPath, ARCH_CONFIG_FILENAME);
  await fs.mkdir(rootPath, { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export async function readArchSystemDesignConfig(
  rootPath: string,
): Promise<ArchSystemDesignConfig | null> {
  try {
    const raw = await fs.readFile(path.join(rootPath, ARCH_CONFIG_FILENAME), "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.version !== 1 || parsed.kind !== "system_design") return null;
    if (typeof parsed.name !== "string" || typeof parsed.documentId !== "string") return null;
    if (typeof parsed.rootPath !== "string") return null;
    return parsed as ArchSystemDesignConfig;
  } catch {
    return null;
  }
}
