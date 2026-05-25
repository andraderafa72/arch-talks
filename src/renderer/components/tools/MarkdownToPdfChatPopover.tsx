import { MessageCircle, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { ChatAiControls } from "@/components/chat/ChatAiControls";
import { ChatMessageMarkdown } from "@/components/chat/ChatMessageMarkdown";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMarkdownToPdfChatContext } from "@/contexts/MarkdownToPdfChatContext";

const tabBasename = (path: string) => {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
};

export function MarkdownToPdfChatPopover() {
  const {
    activeFile,
    isChatOpen,
    activeFileChat,
    activeAiSelection,
    setActiveAiSelection,
    toggleChatOpen,
    closeChat,
    sendChatMessage,
    stopChatMessage,
    clearActiveFileChat,
    isSending,
    streamingAssistantText,
  } = useMarkdownToPdfChatContext();

  const streamEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isSending && streamingAssistantText == null) return;
    streamEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isSending, streamingAssistantText]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[49]">
      {isChatOpen ? (
        <button
          type="button"
          className="pointer-events-auto fixed inset-0 cursor-default border-0 bg-transparent p-0"
          onClick={closeChat}
          tabIndex={-1}
          aria-label="Fechar chat contextual"
        />
      ) : null}
      <div className="pointer-events-auto fixed bottom-6 right-6">
        <Button
          type="button"
          size="sm"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={toggleChatOpen}
          aria-label={isChatOpen ? "Fechar chat contextual" : "Abrir chat contextual"}
          title={isChatOpen ? "Fechar chat contextual" : "Abrir chat contextual"}
        >
          {isChatOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          )}
        </Button>
        {isChatOpen ? (
          <div className="absolute bottom-14 right-0 flex h-[80dvh] min-w-[40dvw] w-[26rem] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Chat</p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  Arquivo ativo:{" "}
                  {activeFile ? tabBasename(activeFile) : "nenhum arquivo ativo"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 shrink-0"
                onClick={clearActiveFileChat}
                disabled={!activeFile || activeFileChat.length === 0 || isSending}
                aria-label="Limpar conversa do arquivo atual"
                title="Limpar conversa"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <ScrollArea className="min-h-0 flex-1 px-3 py-2">
              {activeFileChat.length > 0 ? (
                activeFileChat.map((message) => (
                  <div
                    key={message.id}
                    className={`mb-2 rounded-md px-3 py-2 text-sm ${
                      message.role === "user"
                        ? "bg-zinc-900 text-white dark:bg-zinc-700 dark:text-zinc-100"
                        : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    }`}
                  >
                    <ChatMessageMarkdown
                      content={message.content}
                      variant={message.role === "user" ? "user" : "assistant"}
                    />
                  </div>
                ))
              ) : (
                !isSending && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {activeFile
                      ? "Sem conversa para este arquivo ainda. Envie uma mensagem para iniciar."
                      : "Abra ou crie um arquivo para iniciar uma conversa."}
                  </p>
                )
              )}
              {streamingAssistantText !== null ? (
                <div
                  className="mb-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800/60"
                  aria-busy={isSending}
                  aria-live="polite"
                >
                  {streamingAssistantText.length > 0 ? (
                    <ChatMessageMarkdown content={streamingAssistantText} variant="assistant" />
                  ) : (
                    <div className="space-y-2 py-1">
                      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Gerando resposta…
                      </p>
                      <div className="h-2 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-600" />
                      <div className="h-2 w-4/5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-600" />
                    </div>
                  )}
                </div>
              ) : null}
              <div ref={streamEndRef} />
            </ScrollArea>
            <div className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-700">
              <p className="mb-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                Sugestoes nao sao aplicadas automaticamente.
              </p>
              <ChatAiControls
                selection={activeAiSelection}
                onSelectionChange={setActiveAiSelection}
                placeholder="Descreva a alteracao desejada..."
                disabled={!activeFile || isSending}
                onSubmit={sendChatMessage}
                onStop={stopChatMessage}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
