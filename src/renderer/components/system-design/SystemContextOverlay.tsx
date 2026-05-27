import { useCallback, useEffect, useRef, useState } from "react";
import { FolderSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatAiControls } from "@/components/chat/ChatAiControls";
import { ChatMessageMarkdown } from "@/components/chat/ChatMessageMarkdown";
import { StreamingChatMessage } from "@/components/chat/StreamingChatMessage";
import {
  chatAssistantBubbleClass,
  chatStreamingBubbleClass,
  chatSystemBubbleClass,
  chatUserBubbleClass,
} from "@/lib/chatThemeClasses";
import { chatTabStreamKey } from "@/lib/chatTabStream";
import { isLocalAgentSelection, localAgentFolderScanHint } from "@/lib/localAgentSelection";
import { isAbortError, stoppedAssistantContent, stoppedSystemContent } from "@/lib/localAiErrors";
import { createSystemMessage, resolveSystemTone, systemMarkdownVariant } from "@/lib/chatSystemMessage";
import { useEditorStore } from "@/state/store";
import type { ChatMessage, UiLocale } from "@/types";
import type { LocalAiProviderOption, LocalAiSelection } from "@/types/electron-api";

type SystemContextOverlayProps = {
  documentId: string;
  locale: UiLocale;
  scanFolderPath?: string;
  aiSelection?: LocalAiSelection;
  onAiSelectionChange: (selection: LocalAiSelection | undefined) => void;
};

const chatMarkdownClass =
  "prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-pre:my-2 prose-ul:my-1 prose-ol:my-1";

type ProvidersLoadState = "loading" | "loaded" | "unavailable";

function systemContextEmptyGuide(locale: UiLocale, providersLoading: boolean): string {
  if (providersLoading) {
    return locale === "pt"
      ? `**A carregar agentes de IA…**

Aguarde um momento. Em seguida pode conversar sobre o sistema e, se escolher um agente local, analisar um projeto existente no disco.`
      : `**Loading AI providers…**

Please wait a moment. You will then be able to chat about your system and, if you pick a local agent, analyze an existing codebase on disk.`;
  }
  return locale === "pt"
    ? `**Antes de desenhar diagramas, defina o contexto do sistema.**

1. **Converse aqui em baixo** — descreva o propósito, utilizadores, sistemas externos, dados, tecnologia e fluxos principais. O assistente fará perguntas de seguimento.
2. **Opcional — código existente:** escolha um agente local (Cursor CLI, Claude CLI, …) no seletor de IA e use **Analisar código existente…** no topo para apontar o agente a uma pasta do projeto.
3. **Quando estiver pronto**, clique em **Concluir e criar SYSTEM.md** no topo. Esse ficheiro alimenta todos os diagramas deste espaço de trabalho.

Pode enviar a primeira mensagem quando quiser.`
    : `**Before you draw diagrams, capture what this system is.**

1. **Chat below** — describe the purpose, users, external systems, data, technology, and main flows. The assistant will ask follow-up questions.
2. **Optional — existing code:** pick a **local agent** (Cursor CLI, Claude CLI, …) in the AI selector and use **Analyze existing codebase…** at the top to point the agent at a project folder.
3. **When you are ready**, click **Finish & create SYSTEM.md** in the header. That file powers every diagram in this workspace.

Send your first message whenever you are ready.`;
}

export function SystemContextOverlay({
  documentId,
  locale,
  scanFolderPath,
  aiSelection,
  onAiSelectionChange,
}: SystemContextOverlayProps) {
  const completeSystemContext = useEditorStore((s) => s.completeSystemContext);
  const setSystemDesignScanFolder = useEditorStore((s) => s.setSystemDesignScanFolder);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [providers, setProviders] = useState<LocalAiProviderOption[]>([]);
  const [providersLoadState, setProvidersLoadState] = useState<ProvidersLoadState>(() =>
    typeof window !== "undefined" && window.electronApi?.aiListLocalOptions ? "loading" : "unavailable",
  );
  const [finishing, setFinishing] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const sessionKey = `system-context:${documentId}`;
  const streamTabKey = chatTabStreamKey(documentId, sessionKey);
  const streamState = useEditorStore((s) => s.chatStreams[streamTabKey]);
  const setChatTabStream = useEditorStore((s) => s.setChatTabStream);
  const patchChatTabStreamText = useEditorStore((s) => s.patchChatTabStreamText);
  const clearChatTabStream = useEditorStore((s) => s.clearChatTabStream);
  const submitInFlightRef = useRef(false);

  useEffect(() => {
    const api = window.electronApi;
    if (!api?.aiListLocalOptions) {
      setProvidersLoadState("unavailable");
      return;
    }
    void api
      .aiListLocalOptions()
      .then((opts) => {
        setProviders(opts.providers);
        setProvidersLoadState("loaded");
      })
      .catch(() => {
        setProviders([]);
        setProvidersLoadState("loaded");
      });
  }, []);

  const providersLoading = providersLoadState === "loading";
  const canScanFolder = !providersLoading && isLocalAgentSelection(aiSelection, providers);
  const hasUserMessage = messages.some((m) => m.role === "user");

  const pickScanFolder = useCallback(async () => {
    const api = window.electronApi;
    if (!api?.pickDirectory || !canScanFolder) return;
    const result = await api.pickDirectory();
    if (result.ok) {
      setSystemDesignScanFolder(result.path);
      setMessages((prev) => [
        ...prev,
        createSystemMessage(
          locale === "pt"
            ? `Pasta selecionada para análise: \`${result.path}\``
            : `Selected folder for analysis: \`${result.path}\``,
          "info",
        ),
      ]);
    }
  }, [canScanFolder, locale, setSystemDesignScanFolder]);

  const handleSubmit = useCallback(
    async (promptText: string) => {
      if (submitInFlightRef.current) return;
      const api = window.electronApi;
      if (!api?.systemDesignContextChatSend) {
        setMessages((prev) => [
          ...prev,
          createSystemMessage(
            locale === "pt"
              ? "Assistente de contexto indisponível nesta versão."
              : "Context assistant unavailable in this app version.",
            "error",
          ),
        ]);
        return;
      }

      submitInFlightRef.current = true;
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: promptText,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const streamId = crypto.randomUUID();
      setChatTabStream(documentId, sessionKey, { streamId, text: "" });
      const unsub = api.subscribeAiChatStream?.((payload) => {
        if (payload.streamId !== streamId) return;
        patchChatTabStreamText(documentId, sessionKey, streamId, payload.text);
      });

      try {
        setChatLoading(true);
        const response = await api.systemDesignContextChatSend({
          sessionKey,
          prompt: promptText,
          aiSelection,
          streamId,
          scanFolderPath,
        });
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: response.reply || "",
            timestamp: new Date().toISOString(),
          },
        ]);
      } catch (error) {
        if (isAbortError(error)) {
          const partial = useEditorStore.getState().chatStreams[streamTabKey]?.text ?? "";
          const stopped = stoppedAssistantContent(partial, locale);
          if (stopped) {
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: stopped,
                timestamp: new Date().toISOString(),
              },
            ]);
          } else {
            setMessages((prev) => [...prev, createSystemMessage(stoppedSystemContent(locale), "warning")]);
          }
        } else {
          const msg = error instanceof Error ? error.message : String(error);
          setMessages((prev) => [...prev, createSystemMessage(msg, "error")]);
        }
      } finally {
        unsub?.();
        clearChatTabStream(documentId, sessionKey);
        setChatLoading(false);
        submitInFlightRef.current = false;
      }
    },
    [
      aiSelection,
      clearChatTabStream,
      documentId,
      locale,
      patchChatTabStreamText,
      scanFolderPath,
      sessionKey,
      setChatTabStream,
      streamTabKey,
    ],
  );

  const handleFinish = useCallback(async () => {
    const api = window.electronApi;
    if (!api?.systemDesignMaterializeSystemMd || !hasUserMessage) return;
    setFinishing(true);
    const streamId = crypto.randomUUID();
    try {
      const response = await api.systemDesignMaterializeSystemMd({
        sessionKey,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        aiSelection,
        streamId,
        scanFolderPath,
      });
      completeSystemContext(documentId, response.systemMd);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setMessages((prev) => [...prev, createSystemMessage(msg, "error")]);
    } finally {
      setFinishing(false);
    }
  }, [aiSelection, completeSystemContext, documentId, hasUserMessage, messages, scanFolderPath, sessionKey]);

  const title = locale === "pt" ? "Definir contexto do sistema" : "Define system context";
  const subtitle =
    locale === "pt"
      ? "Descreva o sistema que vai modelar. Quando terminar, criamos o ficheiro SYSTEM.md."
      : "Describe the system you will model. When done, we create SYSTEM.md.";

  const streamingText = streamState?.text ?? "";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#fefefe] dark:bg-zinc-950">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {providersLoading ? (
            <p className="max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
              {locale === "pt" ? "A carregar agentes de IA…" : "Loading AI providers…"}
            </p>
          ) : canScanFolder ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => void pickScanFolder()}>
              <FolderSearch className="mr-1.5 h-4 w-4" aria-hidden />
              {locale === "pt" ? "Analisar código existente…" : "Analyze existing codebase…"}
            </Button>
          ) : providersLoadState === "loaded" ? (
            <p className="max-w-xs text-xs text-zinc-500 dark:text-zinc-400">{localAgentFolderScanHint(locale)}</p>
          ) : null}
          <Button
            type="button"
            disabled={!hasUserMessage || finishing || chatLoading}
            onClick={() => void handleFinish()}
          >
            {finishing
              ? locale === "pt"
                ? "A criar SYSTEM.md…"
                : "Creating SYSTEM.md…"
              : locale === "pt"
                ? "Concluir e criar SYSTEM.md"
                : "Finish & create SYSTEM.md"}
          </Button>
        </div>
      </header>

      {scanFolderPath ? (
        <div className="shrink-0 border-b border-zinc-100 bg-zinc-50 px-6 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
          {locale === "pt" ? "Pasta de análise:" : "Scan folder:"}{" "}
          <code className="font-mono">{scanFolderPath}</code>
        </div>
      ) : null}

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-6 py-4">
          {messages.length === 0 && !chatLoading ? (
            <div className="flex min-h-[12rem] flex-col justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-5 py-6 dark:border-zinc-700 dark:bg-zinc-900/40">
              <ChatMessageMarkdown
                content={systemContextEmptyGuide(locale, providersLoading)}
                variant="assistant"
                className={chatMarkdownClass}
              />
            </div>
          ) : null}
          {messages.map((message) => {
            const systemTone = message.role === "system" ? resolveSystemTone(message) : null;
            return (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "flex justify-end"
                  : message.role === "assistant"
                    ? "flex justify-start"
                    : "flex justify-center"
              }
            >
              <div
                className={
                  message.role === "user"
                    ? `${chatUserBubbleClass()} min-w-0 max-w-[85%] rounded-md px-3 py-2 text-sm`
                    : message.role === "assistant"
                      ? `${chatAssistantBubbleClass()} min-w-0 max-w-[85%] rounded-md px-3 py-2 text-sm`
                      : `${chatSystemBubbleClass(systemTone ?? "info")} w-full rounded-md px-3 py-2 text-sm`
                }
              >
                <ChatMessageMarkdown
                  content={message.content}
                  variant={
                    message.role === "user"
                      ? "user"
                      : message.role === "assistant"
                        ? "assistant"
                        : systemMarkdownVariant(systemTone ?? "info")
                  }
                  className={chatMarkdownClass}
                />
              </div>
            </div>
            );
          })}
          {chatLoading && streamingText ? (
            <div className="flex justify-start">
              <div className={`${chatStreamingBubbleClass()} min-w-0 max-w-[85%] rounded-md px-3 py-2 text-sm`}>
                <StreamingChatMessage
                  content={streamingText}
                  variant="assistant"
                  className={chatMarkdownClass}
                  streamId={streamState?.streamId ?? "streaming"}
                  isStreaming
                />
              </div>
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <footer className="shrink-0 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="mx-auto max-w-3xl">
          <ChatAiControls
            selection={aiSelection}
            onSelectionChange={onAiSelectionChange}
            onProvidersLoaded={setProviders}
            placeholder={
              locale === "pt"
                ? "Descreva o sistema, objetivos, utilizadores…"
                : "Describe the system, goals, users…"
            }
            disabled={finishing}
            onSubmit={handleSubmit}
            onLoadingChange={setChatLoading}
          />
        </div>
      </footer>
    </div>
  );
}
