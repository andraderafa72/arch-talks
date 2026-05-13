export class ChatWorkspaceService {
  async openChatFolder(documentId: string): Promise<void> {
    if (typeof window === "undefined") return;
    await window.electronApi?.chatOpenFolder?.(documentId);
  }
}
