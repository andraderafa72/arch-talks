export function isItemsDocument(value: unknown): value is { items: unknown[] } {
  return Boolean(value && typeof value === "object" && Array.isArray((value as { items?: unknown }).items));
}
