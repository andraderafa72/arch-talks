/** Shared integration identifiers (renderer + Electron main). */

export const INTEGRATION_IDS = ["kroki", "tectonic", "plentymarkets"] as const;

export type IntegrationId = (typeof INTEGRATION_IDS)[number];

export function isIntegrationId(value: string): value is IntegrationId {
  return (INTEGRATION_IDS as readonly string[]).includes(value);
}

export const KROKI_CONTAINER_NAME = "rag-talks-kroki";
export const TECTONIC_CONTAINER_NAME = "rag-talks-tectonic";
export const PLENTYMARKETS_CONTAINER_NAME = "rag-talks-plentymarkets";

export const KROKI_PORT = 9080;
export const KROKI_IMAGE = "yuzutech/kroki";
export const TECTONIC_IMAGE = "tectonictypesetting/tectonic:latest";
