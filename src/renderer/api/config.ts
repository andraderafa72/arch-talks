/**
 * Optional legacy HTTP API (`VITE_BACKEND_URL`). When unset, the app uses local
 * files (Electron → Documents/ArchitectureFiles) or browser localStorage — never localhost by default.
 */
export function getBackendBaseUrl(): string | undefined {
  const raw = import.meta.env.VITE_BACKEND_URL;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/$/, "");
}
