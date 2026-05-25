import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, List, Pencil, Plus, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChatAiControls } from "@/components/chat/ChatAiControls";
import { ChatMessageMarkdown } from "@/components/chat/ChatMessageMarkdown";
import { getBackendBaseUrl } from "@/api/config";
import { chatTabStreamKey } from "@/lib/chatTabStream";
import { buildVaultPlanProposal } from "@/lib/vaultPlanProposal";
import { isAbortError, stoppedAssistantContent, stoppedSystemContent } from "@/lib/localAiErrors";
import {
  createSystemMessage,
  resolveSystemTone,
  systemMarkdownVariant,
  systemMessageBubbleClass,
} from "@/lib/chatSystemMessage";
import { useEditorStore } from "@/state/store";
import type { ChatConversationTab, ChatMessage, ChatSystemTone, Patch } from "@/types";
import type { LocalAiSelection } from "@/types/electron-api";

const CHAT_MESSAGE_MAX_WIDTH_RATIO = 0.8;

function messageBubbleToneClass(message: ChatMessage): string {
  if (message.role === "user") {
    return "bg-zinc-900 text-white dark:bg-zinc-700 dark:text-zinc-100";
  }
  if (message.role === "assistant") {
    return "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100";
  }
  return systemMessageBubbleClass(resolveSystemTone(message));
}

function messageBubbleStyleForRole(
  role: ChatMessage["role"],
  messageMaxWidthPx: number | undefined,
): CSSProperties {
  if (role === "system") {
    return { maxWidth: "100%", width: "100%" };
  }
  return messageMaxWidthPx !== undefined
    ? { maxWidth: messageMaxWidthPx }
    : { maxWidth: `${CHAT_MESSAGE_MAX_WIDTH_RATIO * 100}%` };
}

const chatMessageBubbleClass =
  "min-w-0 rounded-md px-3 py-2 text-sm break-words [overflow-wrap:anywhere]";

function ChatThinkingIndicator({ locale }: { locale: string }) {
  return (
    <div
      className="flex items-center gap-2 py-0.5 text-sm text-zinc-500 dark:text-zinc-400"
      role="status"
      aria-live="polite"
      aria-label={locale === "pt" ? "Pensando" : "Thinking"}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-400 opacity-60 dark:bg-zinc-500" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-zinc-500 dark:bg-zinc-400" />
      </span>
      <span className="italic">
        {locale === "pt" ? "Pensando" : "Thinking"}
        <span className="inline-flex w-[1.25rem]">
          <span className="animate-pulse">.</span>
          <span className="animate-pulse [animation-delay:200ms]">.</span>
          <span className="animate-pulse [animation-delay:400ms]">.</span>
        </span>
      </span>
    </div>
  );
}

function messageRowLayoutClass(role: ChatMessage["role"]) {
  if (role === "user") return "justify-end";
  if (role === "assistant") return "justify-start";
  return "justify-center";
}

const chatMarkdownClass =
  "chat-markdown min-w-0 max-w-full break-words text-sm [overflow-wrap:anywhere] [&_pre]:my-2 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:font-mono [&_pre_code]:text-inherit";

type ChatPanelProps = {
  messages: ChatMessage[];
  files: Record<string, string>;
  activeFile: string;
  onPatchReceived: (patch: Patch) => void;
  onMessage: (message: ChatMessage) => void;
  conversationTabs: ChatConversationTab[];
  allConversationTabs: ChatConversationTab[];
  activeConversationTabId: string;
  onOpenConversationTab: () => void;
  onCloseConversationTab: (tabId: string) => void;
  onSetActiveConversationTab: (tabId: string) => void;
  onRenameConversationTab: (tabId: string, title: string) => void;
  aiSelection?: LocalAiSelection;
  onAiSelectionChange?: (selection: LocalAiSelection | undefined) => void;
};

export function ChatPanel({
  messages,
  files,
  activeFile,
  onPatchReceived,
  onMessage,
  conversationTabs,
  allConversationTabs,
  activeConversationTabId,
  onOpenConversationTab,
  onCloseConversationTab,
  onSetActiveConversationTab,
  onRenameConversationTab,
  aiSelection,
  onAiSelectionChange,
}: ChatPanelProps) {
  const locale = useEditorStore((s) => s.locale);
  const activeConversationId = useEditorStore((s) => s.activeConversationId);
  const conversationKind = useEditorStore(
    (s) => s.conversations[s.activeConversationId]?.kind,
  );
  const stageVaultProposal = useEditorStore((s) => s.stageVaultProposal);
  const addChatMessageToTab = useEditorStore((s) => s.addChatMessageToTab);
  const referenceFolderPath = useEditorStore(
    (s) => s.conversations[s.activeConversationId]?.referenceFolderPath,
  );
  const referenceExcerpt = useEditorStore(
    (s) => s.conversations[s.activeConversationId]?.referenceExcerpt,
  );
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [tabsMenuOpen, setTabsMenuOpen] = useState(false);
  const streamKey = chatTabStreamKey(activeConversationId, activeConversationTabId);
  const workspaceStream = useEditorStore((s) => s.chatStreams[streamKey] ?? null);
  const setChatTabStream = useEditorStore((s) => s.setChatTabStream);
  const patchChatTabStreamText = useEditorStore((s) => s.patchChatTabStreamText);
  const clearChatTabStream = useEditorStore((s) => s.clearChatTabStream);
  const inFlightStreamRef = useRef<{ documentId: string; tabId: string; streamId: string } | null>(null);
  const assistantCommittedStreamIdRef = useRef<string | null>(null);
  const submitInFlightRef = useRef(false);
  const workspaceStreamEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [messageMaxWidthPx, setMessageMaxWidthPx] = useState<number | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);

  const activeTab =
    allConversationTabs.find((tab) => tab.id === activeConversationTabId) ??
    conversationTabs.find((tab) => tab.id === activeConversationTabId) ??
    conversationTabs[0] ??
    allConversationTabs[0];

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const updateMessageMaxWidth = () => {
      const width = container.clientWidth;
      if (width > 0) {
        setMessageMaxWidthPx(Math.floor(width * CHAT_MESSAGE_MAX_WIDTH_RATIO));
      }
    };

    updateMessageMaxWidth();
    const observer = new ResizeObserver(updateMessageMaxWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.electronApi?.subscribeAiChatStream) return;
    return window.electronApi.subscribeAiChatStream((payload) => {
      const inFlight = inFlightStreamRef.current;
      if (!inFlight || payload.streamId !== inFlight.streamId) return;
      patchChatTabStreamText(inFlight.documentId, inFlight.tabId, payload.streamId, payload.text);
    });
  }, [patchChatTabStreamText]);

  useEffect(() => {
    if (!workspaceStream && !isGenerating) return;
    workspaceStreamEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [workspaceStream, isGenerating]);

  const startRename = (tabId?: string) => {
    const target = tabId
      ? allConversationTabs.find((tab) => tab.id === tabId)
      : activeTab;
    if (!target) return;
    setEditingTabId(target.id);
    setEditingTitle(target.title);
  };

  const commitRename = () => {
    if (!editingTabId) return;
    const trimmed = editingTitle.trim();
    if (trimmed) {
      onRenameConversationTab(editingTabId, trimmed);
    }
    setEditingTabId(null);
    setEditingTitle("");
  };

  useEffect(() => {
    if (!tabsMenuOpen) return;
    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-chat-tabs-menu-wrap='true']")) return;
      setTabsMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTabsMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [tabsMenuOpen]);

  const commitAssistantMessage = useCallback(
    (
      replyFromServer: string,
      streamId: string,
      streamContext: { documentId: string; tabId: string },
      streamedText: string,
    ) => {
      if (assistantCommittedStreamIdRef.current === streamId) return;
      assistantCommittedStreamIdRef.current = streamId;

      const content =
        streamedText.trim() ||
        replyFromServer.trim() ||
        (locale === "pt" ? "(sem resposta)" : "(no response)");
      inFlightStreamRef.current = null;
      clearChatTabStream(streamContext.documentId, streamContext.tabId);
      addChatMessageToTab(
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content,
          timestamp: new Date().toISOString(),
        },
        streamContext.tabId,
      );
    },
    [addChatMessageToTab, clearChatTabStream, locale],
  );

  const handleStop = useCallback(async () => {
    if (typeof window === "undefined" || !window.electronApi?.aiChatCancel) return;
    await window.electronApi.aiChatCancel(activeConversationTabId);
  }, [activeConversationTabId]);

  const handleSubmit = useCallback(
    async (promptText: string) => {
      if (submitInFlightRef.current) return;
      submitInFlightRef.current = true;

      try {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: promptText,
        timestamp: new Date().toISOString(),
      };
      onMessage(userMessage);

      if (typeof window !== "undefined" && window.electronApi) {
        const api = window.electronApi;
        const isVault = conversationKind === "vault";

        if (isVault && !api.vaultChatSend) {
          onMessage(
            createSystemMessage(
              locale === "pt"
                ? "Ingestão de vault não está disponível nesta versão do app."
                : "Vault ingestion is not available in this app version.",
              "error",
            ),
          );
          return;
        }

        if (!isVault && !api.workspaceChatSend) {
          onMessage(
            createSystemMessage(
              locale === "pt"
                ? "O assistente de IA local não está disponível nesta versão do app."
                : "Local AI assistant is not available in this app version.",
              "error",
            ),
          );
          return;
        }

        const streamId = crypto.randomUUID();
        const streamContext = { documentId: activeConversationId, tabId: activeConversationTabId };
        inFlightStreamRef.current = { ...streamContext, streamId };
        assistantCommittedStreamIdRef.current = null;
        setChatTabStream(streamContext.documentId, streamContext.tabId, { streamId, text: "" });
        const streamedText = () =>
          useEditorStore.getState().chatStreams[chatTabStreamKey(streamContext.documentId, streamContext.tabId)]
            ?.text ?? "";
        try {
          if (isVault && api.vaultChatSend) {
            const response = await api.vaultChatSend({
              sessionKey: activeConversationTabId,
              documentId: activeConversationId,
              activeFile,
              files,
              prompt: promptText,
              messages: [...messages, userMessage].map((message) => ({
                role: message.role,
                content: message.content,
              })),
              aiSelection,
              streamId,
              referenceFolderPath,
              referenceExcerpt,
            });
            commitAssistantMessage(response.reply || "", streamId, streamContext, streamedText());
            if (response.ingestionSummary && response.ingestionSummary.topicCount > 0) {
              const titles = response.ingestionSummary.topics
                .slice(0, 12)
                .map((t) => `• ${t.title} (${t.type})`)
                .join("\n");
              const more =
                response.ingestionSummary.topics.length > 12
                  ? `\n… +${response.ingestionSummary.topics.length - 12}`
                  : "";
              const filesReady = response.ingestionSummary.filesReady;
              const declared = response.ingestionSummary.declaredFileCount;
              const fileLine =
                declared !== undefined && declared !== filesReady
                  ? locale === "pt"
                    ? `${filesReady} arquivo(s) no plano (${declared} declarados)`
                    : `${filesReady} file(s) in plan (${declared} declared)`
                  : locale === "pt"
                    ? `${filesReady} arquivo(s) no plano`
                    : `${filesReady} file(s) in plan`;
              const failed = filesReady === 0 || (response.validationErrors?.length ?? 0) > 0;
              onMessage(
                createSystemMessage(
                  locale === "pt"
                    ? failed
                      ? `Ingestão incompleta: ${response.ingestionSummary.topicCount} tópico(s) analisado(s), ${fileLine}.\n${titles}${more}`
                      : `Análise: ${response.ingestionSummary.topicCount} tópico(s) analisado(s), ${fileLine} (inclui notas e overviews).\n${titles}${more}`
                    : failed
                      ? `Ingestion incomplete: ${response.ingestionSummary.topicCount} topic(s) analyzed, ${fileLine}.\n${titles}${more}`
                      : `Analysis: ${response.ingestionSummary.topicCount} topic(s) analyzed, ${fileLine} (notes and overviews).\n${titles}${more}`,
                  failed ? "warning" : "info",
                ),
              );
            }
            if (response.validationErrors?.length) {
              onMessage(
                createSystemMessage(
                  locale === "pt"
                    ? `Erros de ingestão:\n${response.validationErrors.map((e) => `• ${e}`).join("\n")}`
                    : `Ingestion errors:\n${response.validationErrors.map((e) => `• ${e}`).join("\n")}`,
                  "error",
                ),
              );
            }
            if (response.validationWarnings?.length) {
              onMessage(
                createSystemMessage(
                  locale === "pt"
                    ? `Avisos de validação:\n${response.validationWarnings.map((w) => `• ${w}`).join("\n")}`
                    : `Validation warnings:\n${response.validationWarnings.map((w) => `• ${w}`).join("\n")}`,
                  "warning",
                ),
              );
            }
            if (response.plan) {
              const proposal = buildVaultPlanProposal(response.plan, files);
              try {
                await stageVaultProposal(proposal);
                onMessage(
                  createSystemMessage(
                    locale === "pt"
                      ? `Arquivos gravados no disco (${response.plan.creates.length} novo(s), ${response.plan.updates.length} atualização(ões)). Revise o diff: Manter confirma; Descartar reverte no disco.`
                      : `Files written to disk (${response.plan.creates.length} new, ${response.plan.updates.length} update(s)). Review the diff: Keep confirms; Discard reverts on disk.`,
                    "info",
                  ),
                );
              } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                onMessage(
                  createSystemMessage(
                    locale === "pt"
                      ? `Falha ao gravar arquivos no disco: ${msg}`
                      : `Failed to write files to disk: ${msg}`,
                    "error",
                  ),
                );
              }
            }
          } else if (api.workspaceChatSend) {
            const response = await api.workspaceChatSend({
              sessionKey: activeConversationTabId,
              activeFile,
              files,
              prompt: promptText,
              aiSelection,
              streamId,
            });
            commitAssistantMessage(response.reply || "", streamId, streamContext, streamedText());
            if (response.patch) {
              onPatchReceived(response.patch as Patch);
            }
          }
        } catch (error: unknown) {
          if (isAbortError(error)) {
            const partial = streamedText();
            inFlightStreamRef.current = null;
            clearChatTabStream(streamContext.documentId, streamContext.tabId);
            const stoppedContent = stoppedAssistantContent(partial, locale);
            if (stoppedContent) {
              addChatMessageToTab(
                {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: stoppedContent,
                  timestamp: new Date().toISOString(),
                },
                streamContext.tabId,
              );
            } else {
              addChatMessageToTab(
                createSystemMessage(stoppedSystemContent(locale), "warning"),
                streamContext.tabId,
              );
            }
            return;
          }
          inFlightStreamRef.current = null;
          clearChatTabStream(streamContext.documentId, streamContext.tabId);
          const msg = error instanceof Error ? error.message : String(error);
          onMessage(createSystemMessage(msg, "error"));
        } finally {
          if (inFlightStreamRef.current?.streamId === streamId) {
            inFlightStreamRef.current = null;
          }
          clearChatTabStream(streamContext.documentId, streamContext.tabId);
        }
        return;
      }

      const backendUrl = getBackendBaseUrl();
      if (!backendUrl) {
        onMessage(
          createSystemMessage(
            locale === "pt"
              ? "Nenhum servidor de IA configurado. Os dados são locais; defina VITE_BACKEND_URL apenas se usar um backend HTTP."
              : "No AI server configured. Data stays local; set VITE_BACKEND_URL only if you use an HTTP backend.",
            "info",
          ),
        );
        return;
      }

      const response = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText, activeFile, files }),
      });
      if (!response.ok) {
        throw new Error(`Chat request failed (${response.status})`);
      }
      const payload = (await response.json()) as { patch?: Patch };
      if (!payload.patch || !Array.isArray(payload.patch.changes)) {
        throw new Error("Backend did not return a valid patch");
      }
      onPatchReceived(payload.patch);
      onMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Patch generated. Review diff before applying.",
        timestamp: new Date().toISOString(),
      });
      } finally {
        submitInFlightRef.current = false;
      }
    },
    [
      activeConversationTabId,
      activeConversationId,
      activeFile,
      commitAssistantMessage,
      conversationKind,
      files,
      messages,
      aiSelection,
      locale,
      onMessage,
      onPatchReceived,
      referenceExcerpt,
      referenceFolderPath,
      stageVaultProposal,
    ],
  );

  const handleSystemMessage = useCallback(
    (content: string, tone: ChatSystemTone = "info") => {
      onMessage(createSystemMessage(content, tone));
    },
    [onMessage],
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col border-r border-zinc-200 bg-[#fefefe] dark:border-zinc-700 dark:bg-zinc-950">
      <div className="flex items-center gap-1 border-b border-zinc-200 bg-[#f8f8f8] px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="relative shrink-0" data-chat-tabs-menu-wrap="true">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => setTabsMenuOpen((open) => !open)}
            aria-label="Open chats list"
            title="Open chats list"
          >
            <List className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          {tabsMenuOpen ? (
            <div className="absolute left-0 top-full z-20 mt-1 max-h-56 min-w-[14rem] overflow-auto rounded-md border border-zinc-200 bg-[#fefefe] py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              {allConversationTabs.map((tab) => {
                const isOpen = conversationTabs.some((openTab) => openTab.id === tab.id);
                return (
                <button
                  key={tab.id}
                  type="button"
                  className={`flex w-full items-center px-2 py-1 text-left text-xs ${
                    tab.id === activeConversationTabId
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      : isOpen
                        ? "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                  onClick={() => {
                    onSetActiveConversationTab(tab.id);
                    setTabsMenuOpen(false);
                  }}
                >
                  <span className="truncate">{tab.title}</span>
                </button>
              );
              })}
            </div>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {conversationTabs.map((tab) => {
            const isActive = tab.id === activeConversationTabId;
            const isEditing = tab.id === editingTabId;
            return (
              <div
                key={tab.id}
                className={`group flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-xs ${
                  isActive
                    ? "border-zinc-300 bg-[#fefefe] text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                    : "border-transparent bg-transparent text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {isEditing ? (
                  <input
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitRename();
                      } else if (event.key === "Escape") {
                        setEditingTabId(null);
                        setEditingTitle("");
                      }
                    }}
                    className="h-5 w-28 rounded border border-zinc-300 bg-white px-1 text-xs leading-none outline-none dark:border-zinc-600 dark:bg-zinc-900"
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    className="max-w-[9rem] truncate leading-none"
                    onClick={() => onSetActiveConversationTab(tab.id)}
                    title={tab.title}
                  >
                    {tab.title}
                  </button>
                )}
                {!isEditing ? (
                  <button
                    type="button"
                    className="invisible rounded p-0.5 hover:bg-zinc-200 group-hover:visible dark:hover:bg-zinc-700"
                    onClick={() => {
                      if (activeConversationTabId !== tab.id) {
                        onSetActiveConversationTab(tab.id);
                      }
                      startRename(tab.id);
                    }}
                    aria-label={`Rename ${tab.title}`}
                  >
                    <Pencil className="h-3 w-3" aria-hidden="true" />
                  </button>
                ) : null}
                {isEditing ? (
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={commitRename}
                    aria-label={`Save ${tab.title} name`}
                  >
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="invisible rounded p-0.5 hover:bg-zinc-200 group-hover:visible dark:hover:bg-zinc-700"
                  onClick={() => onCloseConversationTab(tab.id)}
                  aria-label={`Close ${tab.title}`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 shrink-0 px-2"
          onClick={onOpenConversationTab}
          aria-label="Open new chat tab"
          title="Open new chat tab"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
      <ScrollArea className="min-h-0 min-w-0 flex-1 px-5 py-3">
        <div ref={messagesContainerRef} className="flex min-w-0 w-full flex-col space-y-3">
          {messages.map((message) => {
            const systemTone = message.role === "system" ? resolveSystemTone(message) : null;
            return (
            <div
              key={message.id}
              className={`flex min-w-0 w-full ${
                message.role === "system" ? "" : messageRowLayoutClass(message.role)
              }`}
            >
              <div
                className={`${chatMessageBubbleClass} ${messageBubbleToneClass(message)}`}
                style={messageBubbleStyleForRole(message.role, messageMaxWidthPx)}
                role={message.role === "system" ? "status" : undefined}
                aria-live={message.role === "system" ? "polite" : undefined}
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
          {workspaceStream && workspaceStream.text.length > 0 ? (
            <div className="flex min-w-0 w-full justify-start">
              <div
                className={`${chatMessageBubbleClass} bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100`}
                style={messageBubbleStyleForRole("assistant", messageMaxWidthPx)}
                aria-live="polite"
              >
                <ChatMessageMarkdown
                  content={workspaceStream.text}
                  variant="assistant"
                  className={chatMarkdownClass}
                />
              </div>
            </div>
          ) : null}
          <div ref={workspaceStreamEndRef} />
        </div>
      </ScrollArea>
      {isGenerating ? (
        <div className="shrink-0 px-5 py-2">
          <ChatThinkingIndicator locale={locale} />
        </div>
      ) : null}
      <div className="border-t border-zinc-200 bg-[#fefefe] px-5 py-3 dark:border-zinc-700 dark:bg-zinc-950">
        <ChatAiControls
          selection={aiSelection}
          onSelectionChange={onAiSelectionChange}
          placeholder="Describe requested patch..."
          onSubmit={handleSubmit}
          onStop={handleStop}
          onSystemMessage={handleSystemMessage}
          onLoadingChange={setIsGenerating}
        />
      </div>
    </div>
  );
}
