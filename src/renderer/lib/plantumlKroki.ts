/** Kroki PlantUML raster endpoint (POST body = PlantUML source). */
export const LOCAL_KROKI_BASE_URL = "http://localhost:9080";
export const LOCAL_KROKI_PLANTUML_PNG_URL = `${LOCAL_KROKI_BASE_URL}/png`;
export const KROKI_PLANTUML_PNG_URL = "https://kroki.io/plantuml/png";

export async function fetchPlantUmlPngBlob(source: string, signal: AbortSignal): Promise<Blob> {
  const endpoints = [LOCAL_KROKI_PLANTUML_PNG_URL, KROKI_PLANTUML_PNG_URL];
  let lastError: string | null = null;

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: source,
        signal,
      });
      if (!res.ok) {
        const text = await res.text();
        lastError = text || `HTTP ${res.status}`;
        continue;
      }
      return res.blob();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(lastError || "Unable to render PlantUML preview.");
}
