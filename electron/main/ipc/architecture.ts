import { ipcMain, shell } from "electron";
import {
  chatFsMkdir,
  chatFsRemove,
  chatFsRename,
  ensureArchitectureDataDir,
  loadChat,
  readDocumentFiles,
  readDocumentIndex,
  getChatFolderPath,
  listChatFilesTree,
  saveChat,
  writeDocumentFiles,
  writeDocumentIndex,
  readConversationsJson,
  readTemplatesJson,
  writeConversationsJson,
  writeTemplatesJson,
  listUiThemeFiles,
  writeUiThemeFile,
  deleteUiThemeFile,
  deleteDocument,
  migrateEmbeddedCustomThemes,
} from "../../architectureFileIo.ts";
import { isItemsDocument } from "../validators.ts";

export function registerArchitectureIpc(): void {
  ipcMain.handle("architecture:readConversations", () => readConversationsJson());
  ipcMain.handle("architecture:readTemplates", () => readTemplatesJson());

  ipcMain.handle("architecture:writeConversations", (_evt, doc: unknown) => {
    if (!isItemsDocument(doc)) {
      throw new Error("Invalid conversations payload");
    }
    return writeConversationsJson(doc);
  });

  ipcMain.handle("architecture:writeTemplates", (_evt, doc: unknown) => {
    if (!isItemsDocument(doc)) {
      throw new Error("Invalid templates payload");
    }
    return writeTemplatesJson(doc);
  });

  ipcMain.handle("architecture:listUiThemes", () => listUiThemeFiles());

  ipcMain.handle("architecture:writeUiTheme", (_evt, theme: unknown) => writeUiThemeFile(theme));

  ipcMain.handle("architecture:deleteUiTheme", (_evt, id: unknown) => {
    if (typeof id !== "string" || !id.trim()) throw new Error("Invalid theme id");
    return deleteUiThemeFile(id.trim());
  });

  ipcMain.handle("architecture:migrateEmbeddedUiThemes", (_evt, themes: unknown) => {
    if (!Array.isArray(themes)) throw new Error("Invalid themes payload");
    return migrateEmbeddedCustomThemes(themes);
  });

  ipcMain.handle("architecture:getDataDir", () => ensureArchitectureDataDir());

  ipcMain.handle("document:readIndex", (_evt, documentId: unknown) => {
    if (typeof documentId !== "string" || !documentId) throw new Error("Invalid document id");
    return readDocumentIndex(documentId);
  });
  ipcMain.handle("document:writeIndex", (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
    const { documentId, index } = payload as { documentId: string; index: unknown };
    if (typeof documentId !== "string" || !documentId || !index || typeof index !== "object") {
      throw new Error("Invalid document index payload");
    }
    return writeDocumentIndex(documentId, index as never);
  });
  ipcMain.handle("document:readFiles", (_evt, documentId: unknown) => {
    if (typeof documentId !== "string" || !documentId) throw new Error("Invalid document id");
    return readDocumentFiles(documentId);
  });
  ipcMain.handle("document:writeFiles", (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
    const { documentId, files } = payload as { documentId: string; files: Record<string, string> };
    if (typeof documentId !== "string" || !files || typeof files !== "object") {
      throw new Error("Invalid document files payload");
    }
    return writeDocumentFiles(documentId, files);
  });
  ipcMain.handle("document:delete", (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
    const { documentId, deleteExternalRoot } = payload as {
      documentId?: string;
      deleteExternalRoot?: boolean;
    };
    if (typeof documentId !== "string" || !documentId.trim()) throw new Error("Invalid document id");
    return deleteDocument(documentId.trim(), { deleteExternalRoot: Boolean(deleteExternalRoot) });
  });
  ipcMain.handle("chat:load", (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
    const { documentId, chatId } = payload as { documentId: string; chatId: string };
    if (typeof documentId !== "string" || typeof chatId !== "string") throw new Error("Invalid chat load payload");
    return loadChat(documentId, chatId);
  });
  ipcMain.handle("chat:save", (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
    const { documentId, chatId, detail } = payload as { documentId: string; chatId: string; detail: unknown };
    if (typeof documentId !== "string" || typeof chatId !== "string" || !detail || typeof detail !== "object") {
      throw new Error("Invalid chat save payload");
    }
    return saveChat(documentId, chatId, detail as never);
  });

  ipcMain.handle("chat:listFilesTree", (_evt, chatId: unknown) => {
    if (typeof chatId !== "string" || !chatId) {
      throw new Error("Invalid chat id");
    }
    return listChatFilesTree(chatId);
  });

  ipcMain.handle("chat:mkdir", (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
    const { chatId, relativePath } = payload as { chatId: string; relativePath: string };
    if (typeof chatId !== "string" || typeof relativePath !== "string") {
      throw new Error("Invalid mkdir payload");
    }
    return chatFsMkdir(chatId, relativePath);
  });

  ipcMain.handle("chat:rename", (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
    const { chatId, fromPath, toPath } = payload as { chatId: string; fromPath: string; toPath: string };
    if (typeof chatId !== "string" || typeof fromPath !== "string" || typeof toPath !== "string") {
      throw new Error("Invalid rename payload");
    }
    return chatFsRename(chatId, fromPath, toPath);
  });

  ipcMain.handle("chat:remove", (_evt, payload: unknown) => {
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
    const { chatId, relativePath } = payload as { chatId: string; relativePath: string };
    if (typeof chatId !== "string" || typeof relativePath !== "string") {
      throw new Error("Invalid remove payload");
    }
    return chatFsRemove(chatId, relativePath);
  });

  ipcMain.handle("chat:openFolder", (_evt, chatId: unknown) => {
    if (typeof chatId !== "string" || !chatId) {
      return { ok: false as const, error: "Invalid chat id" };
    }
    void (async () => {
      try {
        const { getVaultRootPathForDocument } = await import("../../architectureFileIo.ts");
        const vaultRoot = await getVaultRootPathForDocument(chatId);
        const folder = vaultRoot ?? (await getChatFolderPath(chatId));
        await shell.openPath(folder);
      } catch (e) {
        console.error(e);
      }
    })();
    return { ok: true as const };
  });
}
