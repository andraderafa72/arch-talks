import type { WebContents } from "electron";
import {
  LocalAIProviderRuntime,
  createConsoleLogger,
  createFileLogger,
} from "@orchestra-ai-runtime";
import type {
  AiLogContentMode,
  AiLogEntry,
  ModelInfo,
  ProcessSession,
  RuntimeLogger,
} from "@orchestra-ai-runtime";
import type { LocalAiOptions, LocalAiSelection } from "../../src/renderer/types/electron-api.ts";

let aiRuntime: LocalAIProviderRuntime | null = null;
let aiRuntimeInitializing: Promise<LocalAIProviderRuntime> | null = null;
let aiRuntimeShutdownStarted = false;
let aiLogFileHandle: ReturnType<typeof createFileLogger> | null = null;

function resolveAiLogContentMode(): AiLogContentMode {
  const raw = process.env.ORCHESTRA_AI_LOG_CONTENT?.trim().toLowerCase();
  return raw === "full" ? "full" : "metadata";
}

function createAiRuntimeLogger(contentMode: AiLogContentMode): RuntimeLogger {
  aiLogFileHandle = createFileLogger();
  const stderrLogger = createConsoleLogger({ compact: true });

  return {
    log(entry: AiLogEntry): void {
      aiLogFileHandle?.logger.log(entry);
      if (entry.level === "error" || entry.level === "warn") {
        stderrLogger.log(entry);
      }
    },
  };
}

type LocalAiChatSessionEntry = {
  session: ProcessSession;
  provider: string;
  modelId: string;
  pending: Promise<unknown>;
  /** Detaches listeners from the previous in-flight turn on this session. */
  detachTurnListeners?: () => void;
  /** Cancels the current in-flight turn (kills agent/model subprocess). */
  cancelTurn?: () => void;
};

function createAbortError(): Error {
  const error = new Error("Cancelled");
  error.name = "AbortError";
  return error;
}

export function isLocalAiAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

const localAiChatSessions = new Map<string, LocalAiChatSessionEntry>();

export function localAiSessionHasUserHistory(sessionKey: string): boolean {
  const entry = localAiChatSessions.get(sessionKey.trim());
  if (!entry) return false;
  return entry.session.messages.some((message) => message.role === "user");
}

async function getAiRuntime(): Promise<LocalAIProviderRuntime> {
  if (aiRuntime) return aiRuntime;
  if (aiRuntimeInitializing) return aiRuntimeInitializing;

  aiRuntimeInitializing = (async () => {
    const contentMode = resolveAiLogContentMode();
    const runtime = new LocalAIProviderRuntime(undefined, {
      logger: createAiRuntimeLogger(contentMode),
      contentMode,
      level: "info",
    });
    await runtime.initialize();
    aiRuntime = runtime;
    return runtime;
  })();

  return aiRuntimeInitializing;
}

export async function shutdownAiRuntime(): Promise<void> {
  const runtime = aiRuntime ?? (aiRuntimeInitializing ? await aiRuntimeInitializing.catch(() => null) : null);
  localAiChatSessions.clear();
  aiRuntime = null;
  aiRuntimeInitializing = null;
  if (runtime) {
    await runtime.shutdown();
  }
  if (aiLogFileHandle) {
    await aiLogFileHandle.close();
    aiLogFileHandle = null;
  }
}

/** Returns false if shutdown was already started (second before-quit). */
export function tryBeginAiRuntimeShutdown(): boolean {
  if (aiRuntimeShutdownStarted) return false;
  aiRuntimeShutdownStarted = true;
  return true;
}

export async function getLocalAiOptions(): Promise<LocalAiOptions> {
  const runtime = await getAiRuntime();
  const providers = runtime.availableProviders.map((adapter) => ({
    provider: adapter.provider,
    label: adapter.provider,
    category: adapter.category as "local-model" | "local-agent",
  }));
  const models = runtime.availableModels.map((m) => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    category: m.category as "local-model" | "local-agent",
  }));
  return { providers, models };
}

function resolveSelectedModel(runtime: LocalAIProviderRuntime, selection: LocalAiSelection | undefined) {
  if (selection?.provider) {
    const matched = runtime.availableModels.find(
      (m) =>
        m.provider === selection.provider &&
        (selection.modelId == null || m.id === selection.modelId),
    );
    if (matched) return matched;
  }
  return runtime.availableModels[0] ?? null;
}

async function getLocalAiChatSession(
  runtime: LocalAIProviderRuntime,
  sessionKey: string,
  model: ModelInfo,
  systemPrompt: string,
): Promise<LocalAiChatSessionEntry> {
  const existing = localAiChatSessions.get(sessionKey);
  const runtimeSession = runtime.getSession(sessionKey);
  const matchesModel =
    existing?.provider === model.provider &&
    existing.modelId === model.id &&
    runtimeSession === existing.session;

  if (
    existing &&
    runtimeSession &&
    matchesModel &&
    existing.session.status !== "closed" &&
    existing.session.status !== "error"
  ) {
    return existing;
  }

  if (existing) {
    localAiChatSessions.delete(sessionKey);
    await runtime.destroySession(existing.session.id).catch(() => false);
  } else if (runtimeSession) {
    await runtime.destroySession(runtimeSession.id).catch(() => false);
  }

  const session = runtime.createSession({
    id: sessionKey,
    provider: model.provider,
    modelId: model.id,
    systemPrompt,
  });
  if (!session) {
    throw new Error(
      `Não foi possível criar a sessão de IA para o provedor ${model.provider}. Verifique se o adapter está registrado.`,
    );
  }
  const entry: LocalAiChatSessionEntry = {
    session,
    provider: model.provider,
    modelId: model.id,
    pending: Promise.resolve(),
  };
  localAiChatSessions.set(sessionKey, entry);
  return entry;
}

export type LocalAiReplyTimeout = {
  /** Fail after this many ms without a new token (default 60s). Resets on every token. */
  idleMs?: number;
  /** Fail if no token/output arrives within this many ms from send (default 120s). */
  firstOutputMs?: number;
};

const DEFAULT_IDLE_TIMEOUT_MS = 60_000;
const DEFAULT_FIRST_OUTPUT_TIMEOUT_MS = 120_000;
const VAULT_IDLE_TIMEOUT_MS = 90_000;
const VAULT_FIRST_OUTPUT_TIMEOUT_MS = 300_000;

async function collectLocalAiReply(
  session: ProcessSession,
  entry: LocalAiChatSessionEntry,
  prompt: string,
  options?: {
    onStreamText?: (accumulated: string) => void;
    replyTimeout?: LocalAiReplyTimeout;
  },
): Promise<string> {
  entry.detachTurnListeners?.();

  const idleMs = options?.replyTimeout?.idleMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  const firstOutputMs = options?.replyTimeout?.firstOutputMs ?? DEFAULT_FIRST_OUTPUT_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    let tokenReply = "";
    let settled = false;
    let activityTimer: ReturnType<typeof setTimeout> | undefined;

    const clearActivityTimer = () => {
      if (activityTimer !== undefined) {
        clearTimeout(activityTimer);
        activityTimer = undefined;
      }
    };

    const armFirstOutputTimeout = () => {
      clearActivityTimer();
      activityTimer = setTimeout(() => {
        settleError(
          new Error(`AI response timeout (no output within ${Math.round(firstOutputMs / 1000)}s)`),
        );
      }, firstOutputMs);
    };

    const armIdleTimeout = () => {
      clearActivityTimer();
      activityTimer = setTimeout(() => {
        settleError(
          new Error(`AI response timeout (no new output for ${Math.round(idleMs / 1000)}s)`),
        );
      }, idleMs);
    };

    const noteOutputActivity = () => {
      armIdleTimeout();
    };

    const cleanup = () => {
      clearActivityTimer();
      session.off("token", onToken);
      session.off("message", onMessage);
      session.off("error", onError);
      session.off("closed", onClosed);
      session.off("exit", onExit);
      if (entry.detachTurnListeners === cleanup) {
        entry.detachTurnListeners = undefined;
      }
    };

    entry.detachTurnListeners = cleanup;

    const clearCancelTurn = () => {
      if (entry.cancelTurn === cancelTurn) {
        entry.cancelTurn = undefined;
      }
    };

    const settle = (value: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      clearCancelTurn();
      resolve(value);
    };

    const settleError = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      clearCancelTurn();
      reject(error);
    };

    const cancelTurn = () => {
      if (settled) return;
      settleError(createAbortError());
      void entry.session.abortTurn().catch(() => undefined);
    };

    entry.cancelTurn = cancelTurn;

    const onToken = ({ token }: { token: string }) => {
      if (token) {
        tokenReply += token;
        options?.onStreamText?.(tokenReply);
      }
      noteOutputActivity();
    };

    const onMessage = ({ message }: { message: { content: string } }) => {
      if (settled) return;
      settle(message.content || tokenReply.trim());
    };

    const onError = ({ error }: { error: Error }) => {
      if (settled) return;
      settleError(error);
    };

    const onClosed = () => {
      if (settled) return;
      settle(
        tokenReply.trim() ||
          [...session.messages].reverse().find((m) => m.role === "assistant")?.content ||
          "",
      );
    };

    const onExit = () => {
      if (settled) return;
      settle(
        tokenReply.trim() ||
          [...session.messages].reverse().find((m) => m.role === "assistant")?.content ||
          "",
      );
    };

    // Use .on (not .once) so cleanup can always session.off(); .once wrappers are not
    // removed by .off and stack across reused chat sessions, causing duplicate replies.
    session.on("token", onToken);
    session.on("message", onMessage);
    session.on("error", onError);
    session.on("closed", onClosed);
    session.on("exit", onExit);

    armFirstOutputTimeout();
    void session.send(prompt);
  });
}

export async function runLocalAiChat({
  sessionKey,
  systemPrompt,
  prompt,
  selection,
  stream,
  replyTimeout,
}: {
  sessionKey: string;
  systemPrompt: string;
  prompt: string;
  selection: LocalAiSelection | undefined;
  stream?: { sender: WebContents; streamId: string };
  replyTimeout?: LocalAiReplyTimeout;
}): Promise<string> {
  const runtime = await getAiRuntime();

  if (runtime.availableModels.length === 0) {
    return "Nenhum provedor de IA local foi encontrado. Instale Ollama, Claude CLI ou Cursor CLI e reinicie o app.";
  }

  const model = resolveSelectedModel(runtime, selection);
  if (!model) {
    return "Provedor ou modelo selecionado não encontrado. Verifique se está instalado e reinicie o app.";
  }

  const onStreamText =
    stream == null
      ? undefined
      : (accumulated: string) => {
          try {
            if (!stream.sender.isDestroyed()) {
              stream.sender.send("aiChat:stream", { streamId: stream.streamId, text: accumulated });
            }
          } catch {
            /* ignore */
          }
        };

  const entry = await getLocalAiChatSession(runtime, sessionKey, model, systemPrompt);
  const reply = entry.pending
    .then(() => collectLocalAiReply(entry.session, entry, prompt, { onStreamText, replyTimeout }));
  entry.pending = reply.catch(() => undefined);
  return reply;
}

export const vaultChatReplyTimeout: LocalAiReplyTimeout = {
  idleMs: VAULT_IDLE_TIMEOUT_MS,
  firstOutputMs: VAULT_FIRST_OUTPUT_TIMEOUT_MS,
};

/** Cancel an in-flight chat turn for the given session key (kills the agent/model subprocess). */
export async function cancelLocalAiChat(sessionKey: string): Promise<boolean> {
  const entry = localAiChatSessions.get(sessionKey.trim());
  if (!entry?.cancelTurn) return false;
  entry.cancelTurn();
  return true;
}
