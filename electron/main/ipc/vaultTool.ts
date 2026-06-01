import { dialog, ipcMain } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import {
  ensureArchitectureDataDir,
  readDocumentFiles,
  writeDocumentFiles,
  writeDocumentIndex,
} from "../../architectureFileIo.ts";
import {
  assignVaultCategory,
  buildArchVaultConfig,
  getVaultCategoryFromConfig,
  isVaultCategory,
  readArchVaultConfig,
  writeArchVaultConfig,
  type VaultCategory,
} from "../../vault/archConfig.ts";
import {
  buildVaultScaffold,
  listVaultRootPaths,
  pickVaultActiveFile,
  readVaultFileAtPath,
  readVaultRootFiles,
  writeVaultRootFiles,
} from "../../vault/vaultRootIo.ts";
import { validateVaultIngestionPlanByCategory } from "../../vault/vaultCategoryValidation.ts";
import { applyConfirmedVaultChanges } from "../../vault/applyVaultIngestionPlan.ts";
import {
  loadSemanticIngestionSkills,
  loadVaultPlanningSkills,
} from "../../vault/loadIngestionSkills.ts";
import { detectVaultIngestionIntent } from "../../vault/detectVaultIngestionIntent.ts";
import {
  buildVaultSourceText,
  formatVaultChatTranscript,
  normalizeVaultChatMessages,
} from "../../vault/vaultChatTranscript.ts";
import {
  buildAlreadyGeneratedIngestionContext,
  buildVaultIngestionSourceTranscript,
} from "../../vault/vaultIngestionContext.ts";
import {
  runBatchedVaultIngestion,
  runConversationalVaultChat,
} from "../../vault/runBatchedVaultIngestion.ts";
import { scanReferenceFolder } from "../../vault/scanReferenceFolder.ts";
import type { VaultConfirmedChange, VaultIngestionPlan } from "../../vault/vaultTypes.ts";
import {
  analyzeVaultFiles,
  formatVaultStructureReport,
  validateVaultIngestionPlan,
} from "../../vault/vaultStructure.ts";
import { buildVaultConsumptionPrompt, buildVaultConsumptionPromptSegments } from "../chatPrompts.ts";
import { runLocalAiChat, vaultChatReplyTimeout } from "../localAiRuntime.ts";
import type { LocalAiSelection } from "../../../src/renderer/types/electron-api.ts";
import { listVaultConsumptionSkills } from "../../vault/vaultConsumptionSkillsIo.ts";
import { resolveSystemPrompt } from "../resolveSystemPrompt.ts";

function sanitizeFolderName(name: string): string {
  const trimmed = name.trim().replace(/[/\\]+/g, "-");
  return trimmed.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "vault";
}

export function registerVaultToolIpc(): void {
  ipcMain.handle("vault:initialize", async (_event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid vault:initialize payload");
    }
    const { documentId, name, category, mode, existingRootPath, parentPath, newFolderName } = payload as {
      documentId: string;
      name: string;
      category: VaultCategory;
      mode: "existing" | "new";
      existingRootPath?: string;
      parentPath?: string;
      newFolderName?: string;
    };

    if (typeof documentId !== "string" || !documentId.trim()) {
      throw new Error("Invalid documentId");
    }
    if (typeof name !== "string" || !name.trim()) {
      throw new Error("Vault name is required");
    }
    if (mode !== "existing" && mode !== "new") {
      throw new Error("Invalid vault location mode");
    }
    if (!isVaultCategory(category)) {
      throw new Error("Vault category is required (business, technical, or project)");
    }

    let vaultRootPath: string;
    if (mode === "existing") {
      if (typeof existingRootPath !== "string" || !existingRootPath.trim()) {
        throw new Error("Select a folder for the vault");
      }
      vaultRootPath = path.resolve(existingRootPath.trim());
      const stat = await fs.stat(vaultRootPath).catch(() => null);
      if (!stat?.isDirectory()) {
        throw new Error("Vault folder does not exist");
      }
    } else {
      if (typeof parentPath !== "string" || !parentPath.trim()) {
        throw new Error("Select a parent folder");
      }
      const folderName =
        typeof newFolderName === "string" && newFolderName.trim()
          ? sanitizeFolderName(newFolderName)
          : sanitizeFolderName(name);
      vaultRootPath = path.resolve(parentPath.trim(), folderName);
      await fs.mkdir(vaultRootPath, { recursive: true });
    }

    await ensureArchitectureDataDir();

    let archConfig = await readArchVaultConfig(vaultRootPath);
    const existingCategory = getVaultCategoryFromConfig(archConfig);

    if (mode === "new") {
      archConfig = buildArchVaultConfig({
        name: name.trim(),
        documentId: documentId.trim(),
        vaultRootPath,
        category,
      });
      await writeArchVaultConfig(vaultRootPath, archConfig);
    } else if (!existingCategory) {
      archConfig = await assignVaultCategory(vaultRootPath, category, {
        name: name.trim(),
        documentId: documentId.trim(),
      });
    } else if (existingCategory !== category) {
      throw new Error(
        `This folder is already a ${existingCategory} vault. Category cannot be changed.`,
      );
    }

    const resolvedCategory = getVaultCategoryFromConfig(archConfig) ?? category;

    let files = await readVaultRootFiles(vaultRootPath);
    if (mode === "new" && Object.keys(files).length === 0) {
      files = { ...buildVaultScaffold(resolvedCategory) };
      await writeVaultRootFiles(vaultRootPath, files);
    }

    const diskPaths = await listVaultRootPaths(vaultRootPath, "all");
    const activeFile = pickVaultActiveFile(files, diskPaths);
    const openEditorTabs = activeFile ? [activeFile] : [];

    const firstChatTabId = crypto.randomUUID();
    await writeDocumentIndex(documentId, {
      id: documentId,
      title: name.trim(),
      kind: "vault",
      templateId: null,
      activeFile: activeFile || undefined,
      fileCount: Object.keys(files).length,
      vaultName: name.trim(),
      vaultRootPath,
      vaultCategory: resolvedCategory,
      chatTabs: [{ id: firstChatTabId, title: "Chat 1" }],
      openChatTabIds: [firstChatTabId],
      activeChatTabId: firstChatTabId,
      pendingPatch: null,
      savedSnapshot: { ...files },
      openEditorTabs,
    });

    return {
      vaultRootPath,
      archConfig,
      vaultCategory: resolvedCategory,
      files,
      diskPaths,
      activeFile,
    };
  });

  ipcMain.handle("vault:assignCategory", async (_event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid vault:assignCategory payload");
    }
    const { documentId, category } = payload as { documentId: string; category: VaultCategory };
    if (typeof documentId !== "string" || !documentId.trim()) {
      throw new Error("Invalid documentId");
    }
    if (!isVaultCategory(category)) {
      throw new Error("Invalid vault category");
    }

    const { getVaultRootPathForDocument, readDocumentIndex, writeDocumentIndex } = await import(
      "../../architectureFileIo.ts"
    );
    const vaultRootPath = await getVaultRootPathForDocument(documentId.trim());
    if (!vaultRootPath) {
      throw new Error("Vault root path is not configured for this conversation");
    }

    const existing = await readArchVaultConfig(vaultRootPath);
    const existingCategory = getVaultCategoryFromConfig(existing);
    if (existingCategory && existingCategory !== category) {
      throw new Error(`Vault is already a ${existingCategory} vault. Category cannot be changed.`);
    }
    if (existingCategory === category) {
      return { vaultCategory: category, archConfig: existing };
    }

    const meta = await readDocumentIndex(documentId.trim());
    const archConfig = await assignVaultCategory(vaultRootPath, category, {
      name: meta.vaultName ?? meta.title ?? "Vault",
      documentId: documentId.trim(),
    });

    await writeDocumentIndex(documentId.trim(), {
      ...meta,
      vaultCategory: category,
    });

    return { vaultCategory: category, archConfig };
  });

  ipcMain.handle("vault:listPaths", async (_event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid vault:listPaths payload");
    }
    const { documentId } = payload as { documentId: string };
    if (typeof documentId !== "string" || !documentId.trim()) {
      throw new Error("Invalid documentId");
    }
    const { getVaultRootPathForDocument } = await import("../../architectureFileIo.ts");
    const vaultRootPath = await getVaultRootPathForDocument(documentId.trim());
    if (!vaultRootPath) {
      throw new Error("Vault root path is not configured for this conversation");
    }
    const diskPaths = await listVaultRootPaths(vaultRootPath, "all");
    const files = await readVaultRootFiles(vaultRootPath);
    const archConfig = await readArchVaultConfig(vaultRootPath);
    const vaultCategory = getVaultCategoryFromConfig(archConfig) ?? undefined;
    return { diskPaths, files, vaultCategory };
  });

  ipcMain.handle("vault:readFile", async (_event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid vault:readFile payload");
    }
    const { documentId, relativePath } = payload as { documentId: string; relativePath: string };
    if (typeof documentId !== "string" || !documentId.trim()) {
      throw new Error("Invalid documentId");
    }
    if (typeof relativePath !== "string" || !relativePath.trim()) {
      throw new Error("Invalid relativePath");
    }
    const { getVaultRootPathForDocument } = await import("../../architectureFileIo.ts");
    const vaultRootPath = await getVaultRootPathForDocument(documentId.trim());
    if (!vaultRootPath) {
      throw new Error("Vault root path is not configured for this conversation");
    }
    const content = await readVaultFileAtPath(vaultRootPath, relativePath.trim());
    return { content };
  });

  ipcMain.handle("vault:pickDirectory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false as const, canceled: true };
    }
    return { ok: true as const, path: result.filePaths[0]! };
  });

  ipcMain.handle("vaultChat:send", async (event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid vaultChat:send payload");
    }
    const {
      sessionKey,
      documentId,
      activeFile,
      files,
      prompt,
      messages,
      aiSelection,
      streamId,
      referenceFolderPath,
      referenceExcerpt,
    } = payload as {
      sessionKey: string;
      documentId: string;
      activeFile: string;
      files: Record<string, string>;
      prompt: string;
      messages?: { role: "user" | "assistant" | "system"; content: string }[];
      aiSelection?: LocalAiSelection;
      streamId?: string;
      referenceFolderPath?: string;
      referenceExcerpt?: string;
    };

    if (
      typeof sessionKey !== "string" ||
      !sessionKey.trim() ||
      typeof documentId !== "string" ||
      !documentId.trim() ||
      typeof activeFile !== "string" ||
      !files ||
      typeof files !== "object" ||
      typeof prompt !== "string"
    ) {
      throw new Error("Invalid vaultChat:send fields");
    }

    const { getVaultRootPathForDocument } = await import("../../architectureFileIo.ts");
    const vaultRootPath = await getVaultRootPathForDocument(documentId.trim());
    if (!vaultRootPath) {
      throw new Error("Vault root path is not configured for this conversation");
    }
    const archConfig = await readArchVaultConfig(vaultRootPath);
    const vaultCategory = getVaultCategoryFromConfig(archConfig);
    if (!vaultCategory) {
      throw new Error("Vault category is not set. Assign a category before ingesting knowledge.");
    }

    const [semanticSkills, planningSkills] = await Promise.all([
      loadSemanticIngestionSkills(),
      loadVaultPlanningSkills(vaultCategory),
    ]);
    const structureReport = formatVaultStructureReport(analyzeVaultFiles(files));

    let excerpt = referenceExcerpt;
    if (!excerpt && referenceFolderPath?.trim()) {
      const scan = await scanReferenceFolder(referenceFolderPath.trim());
      excerpt = scan.excerpt;
    }

    const chatMessages = normalizeVaultChatMessages(messages, prompt);
    const chatTranscript = formatVaultChatTranscript(chatMessages);
    const ingestionSourceTranscript = buildVaultIngestionSourceTranscript(chatMessages);
    const alreadyGeneratedContext = buildAlreadyGeneratedIngestionContext(chatMessages);
    const sourceText = buildVaultSourceText(ingestionSourceTranscript, excerpt);

    const stream =
      typeof streamId === "string" && streamId.trim()
        ? { sender: event.sender, streamId: streamId.trim() }
        : undefined;

    const ingestionCtx = {
      documentId: documentId.trim(),
      sessionKey,
      category: vaultCategory,
      semanticSkills,
      planningSkills,
      structureReport,
      activeFile,
      files,
      userPrompt: prompt,
      sourceText: sourceText || prompt,
      chatMessages,
      alreadyGeneratedContext,
      referenceExcerpt: excerpt,
      aiSelection,
      stream,
      replyTimeout: vaultChatReplyTimeout,
    };

    if (!detectVaultIngestionIntent(prompt, excerpt, chatTranscript)) {
      const conversational = await runConversationalVaultChat(ingestionCtx);
      return { reply: conversational.reply };
    }

    const result = await runBatchedVaultIngestion(ingestionCtx);

    if (!result.ok) {
      return {
        reply: result.reply,
        plan: undefined,
        ingestionSummary: result.ingestionSummary,
        validationErrors: result.validationErrors,
        validationWarnings: result.validationWarnings,
      };
    }

    return {
      reply: result.reply,
      plan: result.plan,
      ingestionSummary: result.ingestionSummary,
      validationWarnings: result.validationWarnings,
    };
  });

  ipcMain.handle("vaultConsumptionChat:send", async (event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid vaultConsumptionChat:send payload");
    }
    const { sessionKey, documentId, activeFile, files, prompt, aiSelection, streamId, skillId, vaultName } =
      payload as {
        sessionKey: string;
        documentId: string;
        activeFile: string;
        files: Record<string, string>;
        prompt: string;
        aiSelection?: LocalAiSelection;
        streamId?: string;
        skillId?: string;
        vaultName?: string;
      };

    if (
      typeof sessionKey !== "string" ||
      !sessionKey.trim() ||
      typeof documentId !== "string" ||
      !documentId.trim() ||
      typeof activeFile !== "string" ||
      !files ||
      typeof files !== "object" ||
      typeof prompt !== "string"
    ) {
      throw new Error("Invalid vaultConsumptionChat:send fields");
    }

    const skills = await listVaultConsumptionSkills();
    const resolvedSkillId =
      typeof skillId === "string" && skillId.trim() ? skillId.trim() : "builtin:vault-search";
    const skill = skills.find((item) => item.id === resolvedSkillId) ?? skills.find((item) => item.id === "builtin:vault-search");
    if (!skill) {
      throw new Error("No vault consumption skill available");
    }

    const { getVaultRootPathForDocument } = await import("../../architectureFileIo.ts");
    const vaultRootPath = await getVaultRootPathForDocument(documentId.trim());
    let mergedFiles = { ...files };
    if (vaultRootPath) {
      const diskFiles = await readVaultRootFiles(vaultRootPath);
      mergedFiles = { ...diskFiles, ...files };
    }

    const promptOptions = {
      skillContent: skill.content,
      skillName: skill.name,
      vaultName: typeof vaultName === "string" ? vaultName : undefined,
      activeFile,
      files: mergedFiles,
    };
    const defaultPrompt = buildVaultConsumptionPrompt(promptOptions);
    const systemPrompt = await resolveSystemPrompt({
      documentId: documentId.trim(),
      promptId: "vault.consumption",
      defaultPrompt,
      segments: buildVaultConsumptionPromptSegments(promptOptions),
      placeholders: { activeFile },
    });

    const stream =
      typeof streamId === "string" && streamId.trim()
        ? { sender: event.sender, streamId: streamId.trim() }
        : undefined;

    const reply = await runLocalAiChat({
      sessionKey,
      systemPrompt,
      prompt,
      selection: aiSelection,
      stream,
      replyTimeout: vaultChatReplyTimeout,
    });

    return { reply: reply.trim() || "(no response)" };
  });

  ipcMain.handle("vaultApplyPlan", async (_event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid vaultApplyPlan payload");
    }
    const { documentId, changes, plan } = payload as {
      documentId: string;
      changes?: VaultConfirmedChange[];
      plan?: VaultIngestionPlan;
    };

    if (typeof documentId !== "string" || !documentId.trim()) {
      throw new Error("Invalid documentId");
    }

    const existing = await readDocumentFiles(documentId);
    let confirmed: VaultConfirmedChange[] = [];

    if (Array.isArray(changes) && changes.length > 0) {
      for (const c of changes) {
        if (!c || typeof c !== "object") continue;
        const row = c as VaultConfirmedChange;
        if (typeof row.path !== "string" || typeof row.content !== "string") continue;
        confirmed.push({ path: row.path, content: row.content });
      }
    } else if (plan) {
      confirmed = [
        ...plan.creates.map(({ path, content }) => ({ path, content })),
        ...plan.updates.map(({ path, content }) => ({ path, content })),
      ];
    }

    if (confirmed.length === 0) {
      throw new Error("No confirmed changes to apply");
    }

    const resolvedPlan = plan;
    if (resolvedPlan) {
      const validation = validateVaultIngestionPlan(resolvedPlan, existing);
      if (!validation.ok) {
        throw new Error(validation.errors.join(" "));
      }
      const { getVaultRootPathForDocument } = await import("../../architectureFileIo.ts");
      const vaultRootPath = await getVaultRootPathForDocument(documentId.trim());
      if (vaultRootPath) {
        const archConfig = await readArchVaultConfig(vaultRootPath);
        const vaultCategory = getVaultCategoryFromConfig(archConfig);
        if (vaultCategory) {
          const categoryValidation = validateVaultIngestionPlanByCategory(resolvedPlan, vaultCategory);
          if (!categoryValidation.ok) {
            throw new Error(categoryValidation.errors.join(" "));
          }
        }
      }
    }

    const merged = applyConfirmedVaultChanges(existing, confirmed);
    await writeDocumentFiles(documentId, merged);

    const updatedPaths = confirmed.map((c) => c.path);
    return { files: merged, updatedPaths };
  });

  ipcMain.handle("vault:pickReferenceFolder", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false as const, canceled: true };
    }
    return { ok: true as const, path: result.filePaths[0]! };
  });

  ipcMain.handle("vault:scanReferenceFolder", async (_event, folderPath: unknown) => {
    if (typeof folderPath !== "string" || !folderPath.trim()) {
      throw new Error("Invalid folder path");
    }
    return scanReferenceFolder(folderPath.trim());
  });
}
