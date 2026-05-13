import { getBackendBaseUrl } from "@/api/config";
import { createBrowserPersistenceProvider } from "@/persistence/adapters/browserPersistenceAdapter";
import { createElectronPersistenceProvider } from "@/persistence/adapters/electronPersistenceAdapter";
import { createHttpPersistenceProvider } from "@/persistence/adapters/httpPersistenceAdapter";
import type { PersistenceProvider } from "@/persistence/ports/storageProvider";

let singletonProvider: PersistenceProvider | null = null;

export function createPersistenceProvider(): PersistenceProvider {
  if (typeof window !== "undefined" && window.electronApi) {
    return createElectronPersistenceProvider();
  }
  const baseUrl = typeof window !== "undefined" ? getBackendBaseUrl() : undefined;
  if (baseUrl) {
    return createHttpPersistenceProvider(baseUrl);
  }
  return createBrowserPersistenceProvider();
}

export function getPersistenceProvider(): PersistenceProvider {
  if (!singletonProvider) {
    singletonProvider = createPersistenceProvider();
  }
  return singletonProvider;
}
