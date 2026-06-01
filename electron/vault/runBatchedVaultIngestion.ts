import type { WebContents } from "electron";
import type { LocalAiSelection } from "../../src/renderer/types/electron-api.ts";
import type { VaultCategory } from "./archConfig.ts";
import {
  buildBatchExtractionPrompt,
  buildBatchExtractionSystemPromptSegments,
  buildBatchExtractionSystemPrompt,
  buildTopicAnalysisPrompt,
  buildTopicAnalysisSystemPromptSegments,
  buildTopicAnalysisSystemPrompt,
  buildVaultConversationalPromptSegments,
  buildVaultConversationalPrompt,
} from "../main/chatPrompts.ts";
import { runLocalAiChat, vaultChatReplyTimeout, type LocalAiReplyTimeout } from "../main/localAiRuntime.ts";
import {
  parseTopicAnalysisFromReply,
  stripTopicAnalysisFromReply,
  validateTopicAnalysis,
} from "./parseTopicAnalysis.ts";
import { parseVaultIngestionPlanFromReply } from "./parseVaultIngestionPlan.ts";
import {
  buildVaultIngestionCorrectivePrompt,
  finalizeVaultIngestionPlan,
  stripIngestionYamlFromReply,
} from "./runVaultIngestionPipeline.ts";
import type { TopicAnalysis, TopicAnalysisEntry, VaultIngestionPlan, VaultIngestionSummary } from "./vaultTypes.ts";
import {
  buildVaultChatTurnPrompt,
  type VaultChatMessage,
} from "./vaultChatTranscript.ts";
import { localAiSessionHasUserHistory } from "../main/localAiRuntime.ts";
import { VAULT_INGESTION_MAX_TOPICS } from "./vaultTypes.ts";
import { validateBatchTopicsMatchPlan, validateVaultPlanMetadata } from "./validateVaultPlanMetadata.ts";
import { resolveSystemPrompt } from "../main/resolveSystemPrompt.ts";

export type BatchedVaultIngestionContext = {
  documentId?: string;
  sessionKey: string;
  category: VaultCategory;
  semanticSkills: string;
  planningSkills: string;
  structureReport: string;
  activeFile: string;
  files: Record<string, string>;
  userPrompt: string;
  sourceText: string;
  chatMessages: VaultChatMessage[];
  alreadyGeneratedContext: string;
  referenceExcerpt?: string;
  aiSelection?: LocalAiSelection;
  stream?: { sender: WebContents; streamId: string };
  replyTimeout?: LocalAiReplyTimeout;
};

export type BatchedVaultIngestionResult =
  | {
      ok: true;
      reply: string;
      plan: VaultIngestionPlan;
      ingestionSummary: VaultIngestionSummary;
      validationWarnings?: string[];
    }
  | {
      ok: false;
      reply: string;
      validationErrors: string[];
      validationWarnings?: string[];
      ingestionSummary?: VaultIngestionSummary;
    };

function buildIngestionSummary(
  analysis: TopicAnalysis,
  filesReady: number,
  declaredFileCount?: number,
): VaultIngestionSummary {
  return {
    topicCount: analysis.topics.length,
    batches: 1,
    filesReady,
    declaredFileCount,
    topics: analysis.topics.map((t) => ({ title: t.title, type: t.type })),
  };
}

async function runModelTurn(
  ctx: BatchedVaultIngestionContext,
  systemPrompt: string,
  prompt: string,
  useStream: boolean,
): Promise<string> {
  return runLocalAiChat({
    sessionKey: ctx.sessionKey,
    systemPrompt,
    prompt,
    selection: ctx.aiSelection,
    stream: useStream ? ctx.stream : undefined,
    replyTimeout: ctx.replyTimeout ?? vaultChatReplyTimeout,
  });
}

async function runTopicAnalysis(ctx: BatchedVaultIngestionContext): Promise<
  | { ok: true; analysis: TopicAnalysis }
  | { ok: false; reply: string; errors: string[] }
> {
  const promptOptions = {
    category: ctx.category,
    semanticSkills: ctx.semanticSkills,
    planningSkills: ctx.planningSkills,
    structureReport: ctx.structureReport,
    files: ctx.files,
    alreadyGeneratedContext: ctx.alreadyGeneratedContext,
  };
  const defaultPrompt = buildTopicAnalysisSystemPrompt(promptOptions);
  const systemPrompt = await resolveSystemPrompt({
    documentId: ctx.documentId,
    promptId: "vault.topic_analysis",
    defaultPrompt,
    segments: buildTopicAnalysisSystemPromptSegments(promptOptions),
    placeholders: { structureReport: ctx.structureReport },
  });

  const userPrompt = buildTopicAnalysisPrompt({
    userPrompt: ctx.userPrompt,
    sourceText: ctx.sourceText,
    structureReport: ctx.structureReport,
    alreadyGeneratedContext: ctx.alreadyGeneratedContext,
  });

  let rawReply = await runModelTurn(ctx, systemPrompt, userPrompt, Boolean(ctx.stream));
  let analysis = parseTopicAnalysisFromReply(rawReply);
  let validation = analysis ? validateTopicAnalysis(analysis) : { ok: false, errors: ["Missing topicAnalysis YAML block"] };

  if (!validation.ok) {
    const corrective = buildVaultIngestionCorrectivePrompt({
      errors: validation.errors,
      warnings: [],
      previousReply: rawReply,
      phase: "topicAnalysis",
    });
    rawReply = await runModelTurn(ctx, systemPrompt, corrective, false);
    analysis = parseTopicAnalysisFromReply(rawReply);
    validation = analysis ? validateTopicAnalysis(analysis) : { ok: false, errors: ["Missing topicAnalysis YAML block"] };
  }

  if (!analysis || !validation.ok) {
    return {
      ok: false,
      reply: stripTopicAnalysisFromReply(rawReply) || "Topic analysis failed.",
      errors: validation.errors,
    };
  }

  return { ok: true, analysis };
}

async function runPlanExtraction(
  ctx: BatchedVaultIngestionContext,
  analysis: TopicAnalysis,
  allTopics: TopicAnalysisEntry[],
): Promise<
  | { ok: true; plan: VaultIngestionPlan; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] }
> {
  const promptOptions = {
    category: ctx.category,
    planningSkills: ctx.planningSkills,
    structureReport: ctx.structureReport,
    activeFile: ctx.activeFile,
    files: ctx.files,
    alreadyGeneratedContext: ctx.alreadyGeneratedContext,
  };
  const defaultPrompt = buildBatchExtractionSystemPrompt(promptOptions);
  const systemPrompt = await resolveSystemPrompt({
    documentId: ctx.documentId,
    promptId: "vault.batch_extraction",
    defaultPrompt,
    segments: buildBatchExtractionSystemPromptSegments(promptOptions),
    placeholders: { activeFile: ctx.activeFile, structureReport: ctx.structureReport },
  });

  const userPrompt = buildBatchExtractionPrompt({
    userPrompt: ctx.userPrompt,
    sourceText: ctx.sourceText,
    structureReport: ctx.structureReport,
    batchTopics: allTopics,
    analysisSummary: analysis.summary,
    alreadyGeneratedContext: ctx.alreadyGeneratedContext,
  });

  const allTopicIds = new Set(analysis.topics.map((t) => t.id));

  let rawReply = await runModelTurn(ctx, systemPrompt, userPrompt, false);
  let plan = parseVaultIngestionPlanFromReply(rawReply);

  const collectErrors = (p: VaultIngestionPlan | undefined): string[] => {
    if (!p) return ["Missing vaultIngestionPlan YAML block"];
    const meta = validateVaultPlanMetadata(p, ctx.files, {
      mergedPlan: true,
      allTopicIds,
    });
    const match = validateBatchTopicsMatchPlan(allTopics, p);
    const errors = [...(meta.ok ? [] : meta.errors), ...(match.ok ? [] : match.errors)];
    return errors;
  };

  let warnings: string[] = [];
  let errors = collectErrors(plan);

  if (errors.length > 0) {
    const corrective = buildVaultIngestionCorrectivePrompt({
      errors,
      warnings,
      previousReply: rawReply,
      phase: "vaultIngestionPlan",
    });
    rawReply = await runModelTurn(ctx, systemPrompt, corrective, false);
    plan = parseVaultIngestionPlanFromReply(rawReply);
    errors = collectErrors(plan);
    if (plan) {
      const match = validateBatchTopicsMatchPlan(allTopics, plan);
      warnings = match.warnings;
    }
  }

  if (!plan || errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  plan.batch_index = plan.batch_index ?? 1;
  plan.batch_total = plan.batch_total ?? 1;
  return { ok: true, plan, warnings };
}

export async function runBatchedVaultIngestion(
  ctx: BatchedVaultIngestionContext,
): Promise<BatchedVaultIngestionResult> {
  const analysisResult = await runTopicAnalysis(ctx);
  if (!analysisResult.ok) {
    return {
      ok: false,
      reply: analysisResult.reply,
      validationErrors: analysisResult.errors,
    };
  }

  const { analysis } = analysisResult;
  if (analysis.topics.length === 0) {
    return {
      ok: false,
      reply: "No durable topics found in the source text.",
      validationErrors: ["topicAnalysis listed zero topics"],
    };
  }

  if (analysis.topics.length > VAULT_INGESTION_MAX_TOPICS) {
    return {
      ok: false,
      reply: `Too many topics (${analysis.topics.length}). Maximum ${VAULT_INGESTION_MAX_TOPICS} per ingestion run.`,
      validationErrors: [`Exceeds max topics (${VAULT_INGESTION_MAX_TOPICS})`],
      ingestionSummary: buildIngestionSummary(analysis, 0),
    };
  }

  const extractionResult = await runPlanExtraction(ctx, analysis, analysis.topics);
  if (!extractionResult.ok) {
    return {
      ok: false,
      reply:
        `Topic analysis found ${analysis.topics.length} topic(s), but extraction failed.\n\n` +
        `${extractionResult.errors.join("; ")}`,
      validationErrors: extractionResult.errors,
      validationWarnings: extractionResult.warnings,
      ingestionSummary: buildIngestionSummary(analysis, 0),
    };
  }

  const allWarnings = [...extractionResult.warnings];
  const finalized = finalizeVaultIngestionPlan(extractionResult.plan, ctx.files, ctx.category);
  allWarnings.push(...finalized.warnings);

  if (finalized.errors.length > 0) {
    return {
      ok: false,
      reply: `Vault plan validation failed: ${finalized.errors.join("; ")}`,
      validationErrors: finalized.errors,
      validationWarnings: allWarnings,
      ingestionSummary: buildIngestionSummary(
        analysis,
        extractionResult.plan.creates.length + extractionResult.plan.updates.length,
      ),
    };
  }

  const filesReady = finalized.plan.creates.length + finalized.plan.updates.length;
  const summary = buildIngestionSummary(analysis, filesReady, extractionResult.plan.files_total_count);

  if (filesReady === 0) {
    return {
      ok: false,
      reply:
        `Topic analysis found ${analysis.topics.length} topic(s), ` +
        `but extraction produced no vault files. Check validation warnings or retry ingestion.\n\n` +
        (allWarnings.length > 0 ? `Warnings:\n${allWarnings.map((w) => `- ${w}`).join("\n")}` : ""),
      validationErrors: ["Extraction returned no create/update entries"],
      validationWarnings: allWarnings.length > 0 ? allWarnings : undefined,
      ingestionSummary: summary,
    };
  }

  const reply =
    `Analyzed ${analysis.topics.length} topic(s). ` +
    `Ready to review ${filesReady} file change(s)` +
    (extractionResult.plan.files_total_count !== undefined
      ? ` (${extractionResult.plan.files_total_count} declared in plan)`
      : "") +
    `.\n\n${analysis.summary}`;

  return {
    ok: true,
    reply,
    plan: finalized.plan,
    ingestionSummary: summary,
    validationWarnings: allWarnings.length > 0 ? allWarnings : undefined,
  };
}

export async function runConversationalVaultChat(ctx: BatchedVaultIngestionContext): Promise<{ reply: string }> {
  const promptOptions = {
    category: ctx.category,
    semanticSkills: ctx.semanticSkills,
    planningSkills: ctx.planningSkills,
    structureReport: ctx.structureReport,
    activeFile: ctx.activeFile,
    files: ctx.files,
    referenceExcerpt: ctx.referenceExcerpt,
  };
  const defaultPrompt = buildVaultConversationalPrompt(promptOptions);
  const systemPrompt = await resolveSystemPrompt({
    documentId: ctx.documentId,
    promptId: "vault.conversational",
    defaultPrompt,
    segments: buildVaultConversationalPromptSegments(promptOptions),
    placeholders: { activeFile: ctx.activeFile, structureReport: ctx.structureReport },
  });

  const turnPrompt =
    localAiSessionHasUserHistory(ctx.sessionKey) || ctx.chatMessages.length <= 1
      ? ctx.userPrompt
      : buildVaultChatTurnPrompt(ctx.userPrompt, ctx.chatMessages);

  const rawReply = await runModelTurn(ctx, systemPrompt, turnPrompt, Boolean(ctx.stream));
  return { reply: stripIngestionYamlFromReply(rawReply) || rawReply.trim() || "(sem resposta)" };
}
