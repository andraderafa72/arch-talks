import type { WebContents } from "electron";
import { LocalAIProviderRuntime } from "@orchestra-ai-runtime";
import type { ModelInfo, ProcessSession } from "@orchestra-ai-runtime";
import type { LocalAiOptions, LocalAiSelection } from "../../src/renderer/types/electron-api.ts";

let aiRuntime: LocalAIProviderRuntime | null = null;
let aiRuntimeInitializing: Promise<LocalAIProviderRuntime> | null = null;
let aiRuntimeShutdownStarted = false;

type LocalAiChatSessionEntry = {
  session: ProcessSession;
  provider: string;
  modelId: string;
  pending: Promise<unknown>;
};

const localAiChatSessions = new Map<string, LocalAiChatSessionEntry>();

async function getAiRuntime(): Promise<LocalAIProviderRuntime> {
  if (aiRuntime) return aiRuntime;
  if (aiRuntimeInitializing) return aiRuntimeInitializing;

  aiRuntimeInitializing = (async () => {
    const runtime = new LocalAIProviderRuntime();
    runtime.on("error", ({ error }) => {
      console.error("[orchestra-ai-runtime]", error.message, error.stack ?? "");
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
  if (!runtime) return;
  await runtime.shutdown();
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

async function collectLocalAiReply(
  session: ProcessSession,
  prompt: string,
  options?: { onStreamText?: (accumulated: string) => void },
): Promise<string> {
  return new Promise((resolve, reject) => {
    let tokenReply = "";
    let settled = false;

    const timeout = setTimeout(() => {
      settleError(new Error("AI response timeout (60s)"));
    }, 60_000);

    const cleanup = () => {
      clearTimeout(timeout);
      session.off("token", onToken);
      session.off("message", onMessage);
      session.off("error", onError);
      session.off("closed", onClosed);
      session.off("exit", onExit);
    };

    const settle = (value: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const settleError = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const onToken = ({ token }: { token: string }) => {
      tokenReply += token;
      options?.onStreamText?.(tokenReply);
    };

    const onMessage = ({ message }: { message: { content: string } }) => {
      settle(message.content || tokenReply.trim());
    };

    const onError = ({ error }: { error: Error }) => {
      settleError(error);
    };

    const onClosed = () => {
      settle(tokenReply.trim() || [...session.messages].reverse().find((m) => m.role === "assistant")?.content || "");
    };

    const onExit = () => {
      settle(tokenReply.trim() || [...session.messages].reverse().find((m) => m.role === "assistant")?.content || "");
    };

    session.on("token", onToken);
    session.once("message", onMessage);
    session.once("error", onError);
    session.once("closed", onClosed);
    session.once("exit", onExit);

    void session.send(prompt);
  });
}

export async function runLocalAiChat({
  sessionKey,
  systemPrompt,
  prompt,
  selection,
  stream,
}: {
  sessionKey: string;
  systemPrompt: string;
  prompt: string;
  selection: LocalAiSelection | undefined;
  stream?: { sender: WebContents; streamId: string };
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
    .catch((e) => console.error(e))
    .then(() => collectLocalAiReply(entry.session, prompt, { onStreamText }));
  entry.pending = reply.catch(() => undefined);
  return reply;
}
