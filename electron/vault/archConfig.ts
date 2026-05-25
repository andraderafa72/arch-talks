import fs from "node:fs/promises";
import path from "node:path";

export const ARCH_CONFIG_FILENAME = "arch-config.json";

export type VaultCategory = "business" | "technical" | "project";

const VAULT_CATEGORIES = new Set<VaultCategory>(["business", "technical", "project"]);

export function isVaultCategory(value: unknown): value is VaultCategory {
  return typeof value === "string" && VAULT_CATEGORIES.has(value as VaultCategory);
}

export type ArchVaultConfigV1 = {
  version: 1;
  name: string;
  createdAt: string;
  documentId: string;
  vaultRootPath: string;
};

export type ArchVaultConfig = {
  version: 2;
  name: string;
  createdAt: string;
  documentId: string;
  vaultRootPath: string;
  category: VaultCategory;
};

export type ArchVaultConfigRead = ArchVaultConfig | (ArchVaultConfigV1 & { category?: undefined });

export function buildArchVaultConfig(options: {
  name: string;
  documentId: string;
  vaultRootPath: string;
  category: VaultCategory;
  createdAt?: string;
}): ArchVaultConfig {
  return {
    version: 2,
    name: options.name.trim(),
    createdAt: options.createdAt ?? new Date().toISOString(),
    documentId: options.documentId,
    vaultRootPath: options.vaultRootPath,
    category: options.category,
  };
}

export async function writeArchVaultConfig(vaultRootPath: string, config: ArchVaultConfig): Promise<void> {
  const target = path.join(vaultRootPath, ARCH_CONFIG_FILENAME);
  await fs.mkdir(vaultRootPath, { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export async function readArchVaultConfig(vaultRootPath: string): Promise<ArchVaultConfigRead | null> {
  try {
    const raw = await fs.readFile(path.join(vaultRootPath, ARCH_CONFIG_FILENAME), "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.name !== "string") return null;
    if (parsed.version === 2) {
      if (!isVaultCategory(parsed.category)) return null;
      return parsed as ArchVaultConfig;
    }
    if (parsed.version === 1) {
      return parsed as ArchVaultConfigV1;
    }
    return null;
  } catch {
    return null;
  }
}

export function getVaultCategoryFromConfig(config: ArchVaultConfigRead | null): VaultCategory | null {
  if (!config) return null;
  if (config.version === 2 && isVaultCategory(config.category)) {
    return config.category;
  }
  return null;
}

export async function assignVaultCategory(
  vaultRootPath: string,
  category: VaultCategory,
  options: { name: string; documentId: string },
): Promise<ArchVaultConfig> {
  const existing = await readArchVaultConfig(vaultRootPath);
  const config = buildArchVaultConfig({
    name: existing?.name ?? options.name,
    documentId: existing?.documentId ?? options.documentId,
    vaultRootPath,
    category,
    createdAt: existing?.createdAt,
  });
  await writeArchVaultConfig(vaultRootPath, config);
  return config;
}
