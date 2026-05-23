export const UML_PREVIEW_MIN_ZOOM = 0.25;
export const UML_PREVIEW_MAX_ZOOM = 4;
export const UML_PREVIEW_ZOOM_STEP = 0.25;

export type UmlPreviewZoomMap = Record<string, number>;

export function clampUmlPreviewZoom(value: number): number {
  return Math.min(UML_PREVIEW_MAX_ZOOM, Math.max(UML_PREVIEW_MIN_ZOOM, value));
}

export function getUmlPreviewZoom(map: UmlPreviewZoomMap | undefined, fileKey: string): number {
  const stored = map?.[fileKey];
  return stored === undefined ? 1 : clampUmlPreviewZoom(stored);
}

export function setUmlPreviewZoomInMap(
  map: UmlPreviewZoomMap | undefined,
  fileKey: string,
  zoom: number,
): UmlPreviewZoomMap {
  const next = { ...(map ?? {}) };
  const clamped = clampUmlPreviewZoom(zoom);
  if (clamped === 1) {
    delete next[fileKey];
  } else {
    next[fileKey] = clamped;
  }
  return next;
}

export function removeUmlPreviewZoomKey(
  map: UmlPreviewZoomMap | undefined,
  fileKey: string,
): UmlPreviewZoomMap | undefined {
  if (!map || !Object.hasOwn(map, fileKey)) return map;
  const next = { ...map };
  delete next[fileKey];
  return Object.keys(next).length > 0 ? next : undefined;
}

export function removeUmlPreviewZoomByPrefix(
  map: UmlPreviewZoomMap | undefined,
  prefix: string,
): UmlPreviewZoomMap | undefined {
  if (!map) return map;
  const norm = prefix.replace(/\\/g, "/").replace(/\/+$/, "").trim();
  if (!norm) return map;
  const matches = (key: string) => key === norm || key.startsWith(`${norm}/`);
  const next: UmlPreviewZoomMap = {};
  for (const [key, value] of Object.entries(map)) {
    if (!matches(key)) next[key] = value;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export function migrateUmlPreviewZoomKey(
  map: UmlPreviewZoomMap | undefined,
  fromKey: string,
  toKey: string,
): UmlPreviewZoomMap | undefined {
  if (!map || !Object.hasOwn(map, fromKey)) return map;
  const next = { ...map };
  next[toKey] = next[fromKey]!;
  delete next[fromKey];
  return next;
}

export function renameUmlPreviewZoomPaths(
  map: UmlPreviewZoomMap | undefined,
  fromPath: string,
  toPath: string,
): UmlPreviewZoomMap | undefined {
  if (!map) return map;
  const from = fromPath.trim();
  const to = toPath.trim();
  if (!from || !to || from === to) return map;

  const isDirPrefix = (key: string) => key === from || key.startsWith(`${from}/`);
  const next: UmlPreviewZoomMap = {};

  for (const [key, value] of Object.entries(map)) {
    if (isDirPrefix(key)) {
      const suffix = key === from ? "" : key.slice(from.length + 1);
      const newKey = suffix ? `${to}/${suffix}` : to;
      next[newKey] = value;
    } else {
      next[key] = value;
    }
  }

  return Object.keys(next).length > 0 ? next : undefined;
}
