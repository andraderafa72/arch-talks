import { Plus, Trash2 } from "lucide-react";
import { useCallback, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChatAiControls } from "@/components/chat/ChatAiControls";
import { ChatMessageMarkdown } from "@/components/chat/ChatMessageMarkdown";
import { StreamingChatMessage } from "@/components/chat/StreamingChatMessage";
import { DailyReportBlockPlanEditor } from "@/components/daily-report/DailyReportBlockPlanEditor";
import { useDailyReportContext } from "@/contexts/DailyReportContext";
import {
  chatAssistantBubbleClass,
  chatStreamingBubbleClass,
  chatSystemBubbleClass,
  chatUserBubbleClass,
} from "@/lib/chatThemeClasses";
import { dailyReportStrings } from "@/lib/uiCopy";
import { useEditorStore } from "@/state/store";
import { blockPlanTotals, formatDisplayDate } from "@/types/daily-report";

export function DailyReportChatPanel() {
  const locale = useEditorStore((s) => s.locale);
  const t = dailyReportStrings(locale);
  const {
    selectedDate,
    document,
    isSending,
    isBlockPlanValid,
    activeChatTabId,
    setActiveChatTabId,
    addChatTab,
    clearActiveChatTab,
    streamingAssistantText,
    streamingStreamId,
    activeAiSelection,
    setActiveAiSelection,
    sendChatMessage,
    stopChatMessage,
  } = useDailyReportContext();

  const streamEndRef = useRef<HTMLDivElement | null>(null);
  const tabs = document?.chatTabs ?? [];
  const currentTab =
    tabs.find((tab) => tab.id === activeChatTabId) ??
    tabs[0] ??
    null;
  const messages = currentTab?.messages ?? [];

  const { blockCount, totalHours } = blockPlanTotals(document?.taskBlockPlan ?? []);
  const blockPlanSummary =
    (document?.taskBlockPlan?.length ?? 0) > 0 ? `${blockCount} · ${totalHours}h` : t.blockPlanEmpty;

  const handleSubmit = useCallback(
    async (prompt: string) => {
      await sendChatMessage(prompt);
    },
    [sendChatMessage],
  );

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-zinc-200 bg-[var(--ui-panel-bg)] dark:border-zinc-700">
      <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
        <h2 className="text-sm font-semibold">{t.chat}</h2>
        <p className="text-xs text-zinc-500">{formatDisplayDate(selectedDate, locale)}</p>
      </div>
      <details className="border-b border-zinc-200 dark:border-zinc-700">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800">
          <span className="font-medium">{t.blockPlanTitle}</span>
          <span className="text-[10px] text-zinc-400">{blockPlanSummary}</span>
        </summary>
        <DailyReportBlockPlanEditor selectedDate={selectedDate} document={document} compact />
      </details>

      <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {tabs.map((tab, idx) => {
              const isActive = tab.id === (activeChatTabId || tabs[0]?.id);
              const title = tab.title?.trim() || `Chat ${idx + 1}`;
              return (
                <div
                  key={tab.id}
                  className={`group flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-xs ${
                    isActive
                      ? "border-[var(--ui-border)] bg-[var(--ui-panel-bg)] text-[var(--ui-shell-fg)]"
                      : "border-transparent bg-transparent text-[var(--ui-chat-tab-inactive-fg)] hover:bg-[var(--ui-chat-tab-hover-bg)]"
                  }`}
                >
                  <button
                    type="button"
                    className="max-w-[9rem] truncate leading-none"
                    onClick={() => setActiveChatTabId(tab.id)}
                    title={title}
                  >
                    {title}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 px-2"
              onClick={addChatTab}
              aria-label="Add chat tab"
              title="Add chat tab"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 gap-1 px-2 text-xs"
              onClick={clearActiveChatTab}
              disabled={!currentTab || currentTab.messages.length === 0}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              {locale === "pt" ? "Limpar" : "Clear"}
            </Button>
          </div>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1 px-3 py-2">
        <div className="flex flex-col gap-2 pb-2">
          {messages.length === 0 ? (
            <p className="text-sm text-zinc-500">{t.noEntries}</p>
          ) : null}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : msg.role === "system" ? "justify-center" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? chatUserBubbleClass()
                    : msg.role === "system"
                      ? chatSystemBubbleClass("warning")
                      : chatAssistantBubbleClass()
                }`}
              >
                <ChatMessageMarkdown
                  content={msg.content}
                  variant={msg.role === "user" ? "user" : "assistant"}
                />
              </div>
            </div>
          ))}
          {streamingAssistantText !== null ? (
            <div className="flex justify-start">
              <div className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${chatStreamingBubbleClass()}`}>
                {streamingAssistantText.length > 0 && streamingStreamId ? (
                  <StreamingChatMessage
                    content={streamingAssistantText}
                    variant="assistant"
                    streamId={streamingStreamId}
                    isStreaming={isSending}
                    scrollAnchorRef={streamEndRef}
                  />
                ) : (
                  <span className="text-xs text-zinc-500">…</span>
                )}
              </div>
            </div>
          ) : null}
          <div ref={streamEndRef} />
        </div>
      </ScrollArea>
      <div className="border-t border-zinc-200 p-2 dark:border-zinc-700">
        {!isBlockPlanValid ? (
          <p className="mb-2 text-xs text-red-600 dark:text-red-400" role="alert">
            {t.blockPlanInvalidSend}
          </p>
        ) : null}
        <ChatAiControls
          selection={activeAiSelection}
          onSelectionChange={setActiveAiSelection}
          placeholder={t.placeholder}
          disabled={isSending}
          submitDisabled={isSending || !isBlockPlanValid}
          onSubmit={handleSubmit}
          onStop={stopChatMessage}
        />
      </div>
    </div>
  );
}
