export function chatTabStreamKey(documentId: string, tabId: string): string {
  return `${documentId}:${tabId}`;
}
