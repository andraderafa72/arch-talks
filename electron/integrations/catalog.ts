import {
  INTEGRATION_IDS,
  KROKI_CONTAINER_NAME,
  KROKI_IMAGE,
  KROKI_PORT,
  PLENTYMARKETS_CONTAINER_NAME,
  TECTONIC_CONTAINER_NAME,
  TECTONIC_IMAGE,
  type IntegrationId,
} from "../../shared/integrations.ts";

export type IntegrationCatalogEntry = {
  id: IntegrationId;
  startCommandArgv: string[];
  startCommandDisplay: string;
  canExecute: boolean;
};

const KROKI_START: string[] = [
  "docker",
  "run",
  "-d",
  "--name",
  KROKI_CONTAINER_NAME,
  "-p",
  `${KROKI_PORT}:8000`,
  KROKI_IMAGE,
];

const TECTONIC_START: string[] = [
  "docker",
  "run",
  "-d",
  "--name",
  TECTONIC_CONTAINER_NAME,
  "--entrypoint",
  "sleep",
  TECTONIC_IMAGE,
  "infinity",
];

export const INTEGRATION_CATALOG: Record<IntegrationId, IntegrationCatalogEntry> = {
  kroki: {
    id: "kroki",
    startCommandArgv: KROKI_START,
    startCommandDisplay: KROKI_START.join(" "),
    canExecute: true,
  },
  tectonic: {
    id: "tectonic",
    startCommandArgv: TECTONIC_START,
    startCommandDisplay: TECTONIC_START.join(" "),
    canExecute: true,
  },
  plentymarkets: {
    id: "plentymarkets",
    startCommandArgv: [
      "docker",
      "run",
      "-d",
      "--name",
      PLENTYMARKETS_CONTAINER_NAME,
      "TODO_IMAGE",
    ],
    startCommandDisplay: `docker run -d --name ${PLENTYMARKETS_CONTAINER_NAME} <image>  # configure image and ports`,
    canExecute: false,
  },
};

export function getCatalogEntry(id: string): IntegrationCatalogEntry | null {
  if (!(INTEGRATION_IDS as readonly string[]).includes(id)) return null;
  return INTEGRATION_CATALOG[id as IntegrationId];
}
