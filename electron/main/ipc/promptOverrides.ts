import { ipcMain } from "electron";
import {
  buildBatchExtractionSystemPrompt,
  buildBatchExtractionSystemPromptSegments,
  buildSystemContextOnboardingPrompt,
  buildSystemContextOnboardingPromptSegments,
  buildSystemDesignChatPromptSegments,
  buildSystemDesignChatSystemPrompt,
  buildSystemDesignMaterializationPrompt,
  buildSystemDesignMaterializationPromptSegments,
  buildTopicAnalysisSystemPrompt,
  buildTopicAnalysisSystemPromptSegments,
  buildVaultConsumptionPrompt,
  buildVaultConsumptionPromptSegments,
  buildVaultConversationalPrompt,
  buildVaultConversationalPromptSegments,
  buildWorkspaceChatPromptSegments,
  buildWorkspaceChatSystemPrompt,
} from "../chatPrompts.ts";
import { listPromptCatalog, type PromptId } from "../promptRegistry.ts";
import {
  deleteScopedPromptOverride,
  readPromptOverrides,
  readScopedPromptOverrides,
  savePromptOverride,
  setScopedPromptOverrideEnabled,
  type PromptOverrideScope,
} from "../promptOverridesIo.ts";
import { resolveSystemPrompt } from "../resolveSystemPrompt.ts";
import { loadSemanticIngestionSkills, loadVaultPlanningSkills } from "../../vault/loadIngestionSkills.ts";
import { analyzeVaultFiles, formatVaultStructureReport } from "../../vault/vaultStructure.ts";
import type { ConversationKind } from "../../../src/renderer/types.ts";
import type { VaultCategory } from "../../../src/renderer/types/electron-api.ts";

function assertPromptId(value: unknown): PromptId {
  if (typeof value !== "string") throw new Error("Invalid prompt id");
  const found = listPromptCatalog().some((item) => item.id === value);
  if (!found) throw new Error("Invalid prompt id");
  return value as PromptId;
}

function assertDocumentId(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("Invalid document id");
  return value.trim();
}

function scopeFromPayload(payload: Record<string, unknown>): PromptOverrideScope {
  if (payload.scope === "global") return { kind: "global" };
  return { kind: "document", documentId: assertDocumentId(payload.documentId) };
}

function scopeFromReadArgs(scopeOrDocumentId: unknown, documentId: unknown): PromptOverrideScope {
  if (scopeOrDocumentId === "global") return { kind: "global" };
  if (scopeOrDocumentId === "document") return { kind: "document", documentId: assertDocumentId(documentId) };
  if (scopeOrDocumentId && typeof scopeOrDocumentId === "object" && !Array.isArray(scopeOrDocumentId)) {
    return scopeFromPayload(scopeOrDocumentId as Record<string, unknown>);
  }
  return { kind: "document", documentId: assertDocumentId(scopeOrDocumentId) };
}

function categoryOrDefault(value: unknown): VaultCategory {
  return value === "business" || value === "technical" || value === "project" ? value : "technical";
}

async function buildPreview(payload: Record<string, unknown>): Promise<{
  defaultPrompt: string;
  resolvedPrompt: string;
  segments: Record<string, string>;
}> {
  const scope = scopeFromPayload(payload);
  const promptId = assertPromptId(payload.promptId);
  const files =
    payload.files && typeof payload.files === "object" && !Array.isArray(payload.files)
      ? (payload.files as Record<string, string>)
      : {};
  const activeFile = typeof payload.activeFile === "string" ? payload.activeFile : Object.keys(files).sort()[0] ?? "";
  const category = categoryOrDefault(payload.vaultCategory);
  const structureReport =
    typeof payload.structureReport === "string" ? payload.structureReport : formatVaultStructureReport(analyzeVaultFiles(files));
  const semanticSkills = await (promptId.startsWith("vault.")
    ? loadSemanticIngestionSkills().catch(() => "")
    : Promise.resolve(""));
  const planningSkills = await (promptId.startsWith("vault.")
    ? loadVaultPlanningSkills(category).catch(() => "")
    : Promise.resolve(""));

  let defaultPrompt = "";
  let segments: Record<string, string> = {};
  if (promptId === "technical_document.chat") {
    defaultPrompt = buildWorkspaceChatSystemPrompt(activeFile, files);
    segments = buildWorkspaceChatPromptSegments(activeFile, files);
  } else if (promptId === "system_design.onboarding") {
    const scanFolderPath = typeof payload.scanFolderPath === "string" ? payload.scanFolderPath : undefined;
    defaultPrompt = buildSystemContextOnboardingPrompt(scanFolderPath);
    segments = buildSystemContextOnboardingPromptSegments(scanFolderPath);
  } else if (promptId === "system_design.materialize") {
    const existingPumlPaths = Object.keys(files).filter((file) => file.endsWith(".puml"));
    defaultPrompt = buildSystemDesignMaterializationPrompt({ existingPumlPaths });
    segments = buildSystemDesignMaterializationPromptSegments({ existingPumlPaths });
  } else if (promptId === "system_design.chat") {
    const systemMd = typeof payload.systemMd === "string" ? payload.systemMd : files["SYSTEM.md"] ?? "";
    const options = { activeFile, files, systemMd };
    defaultPrompt = buildSystemDesignChatSystemPrompt(options);
    segments = buildSystemDesignChatPromptSegments(options);
  } else if (promptId === "vault.conversational") {
    const options = { category, semanticSkills, planningSkills, structureReport, activeFile, files };
    defaultPrompt = buildVaultConversationalPrompt(options);
    segments = buildVaultConversationalPromptSegments(options);
  } else if (promptId === "vault.topic_analysis") {
    const options = { category, semanticSkills, planningSkills, structureReport, files };
    defaultPrompt = buildTopicAnalysisSystemPrompt(options);
    segments = buildTopicAnalysisSystemPromptSegments(options);
  } else if (promptId === "vault.batch_extraction") {
    const options = { category, planningSkills, structureReport, activeFile, files };
    defaultPrompt = buildBatchExtractionSystemPrompt(options);
    segments = buildBatchExtractionSystemPromptSegments(options);
  } else if (promptId === "vault.consumption") {
    const options = {
      skillContent: "",
      skillName: "Current skill",
      vaultName: typeof payload.vaultName === "string" ? payload.vaultName : undefined,
      activeFile,
      files,
    };
    defaultPrompt = buildVaultConsumptionPrompt(options);
    segments = buildVaultConsumptionPromptSegments(options);
  }

  const resolvedPrompt = await resolveSystemPrompt({
    documentId: scope.kind === "document" ? scope.documentId : undefined,
    promptId,
    defaultPrompt,
    segments,
    placeholders: { activeFile, structureReport },
  });
  return { defaultPrompt, resolvedPrompt, segments };
}

export function registerPromptOverridesIpc(): void {
  ipcMain.removeHandler("promptOverrides:listCatalog");
  ipcMain.handle("promptOverrides:listCatalog", (_event, kind: unknown) => {
    const k =
      kind === "technical_document" || kind === "system_design" || kind === "vault"
        ? (kind as ConversationKind)
        : undefined;
    return listPromptCatalog(k);
  });

  ipcMain.removeHandler("promptOverrides:readManifest");
  ipcMain.handle("promptOverrides:readManifest", (_event, scopeOrDocumentId: unknown, documentId: unknown) => {
    const scope = scopeFromReadArgs(scopeOrDocumentId, documentId);
    return scope.kind === "global" ? readScopedPromptOverrides(scope) : readPromptOverrides(scope.documentId);
  });

  ipcMain.removeHandler("promptOverrides:preview");
  ipcMain.handle("promptOverrides:preview", (_event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid prompt preview payload");
    }
    return buildPreview(payload as Record<string, unknown>);
  });

  ipcMain.removeHandler("promptOverrides:save");
  ipcMain.handle("promptOverrides:save", (_event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid prompt override payload");
    }
    const p = payload as Record<string, unknown>;
    const scope = scopeFromPayload(p);
    return savePromptOverride({
      scope,
      promptId: assertPromptId(p.promptId),
      mode: p.mode === "segments" ? "segments" : "full",
      content: typeof p.content === "string" ? p.content : "",
      segmentId: typeof p.segmentId === "string" ? p.segmentId : undefined,
      enabled: typeof p.enabled === "boolean" ? p.enabled : undefined,
    });
  });

  ipcMain.removeHandler("promptOverrides:delete");
  ipcMain.handle("promptOverrides:delete", (_event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid prompt override delete payload");
    }
    const p = payload as Record<string, unknown>;
    return deleteScopedPromptOverride(
      scopeFromPayload(p),
      assertPromptId(p.promptId),
      typeof p.segmentId === "string" ? p.segmentId : undefined,
    );
  });

  ipcMain.removeHandler("promptOverrides:setEnabled");
  ipcMain.handle("promptOverrides:setEnabled", (_event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid prompt override toggle payload");
    }
    const p = payload as Record<string, unknown>;
    if (typeof p.enabled !== "boolean") throw new Error("enabled is required");
    return setScopedPromptOverrideEnabled(
      scopeFromPayload(p),
      assertPromptId(p.promptId),
      p.enabled,
      typeof p.segmentId === "string" ? p.segmentId : undefined,
    );
  });
}
