import { useCallback, useEffect, useState } from "react";
import { Check, List, Pencil, Plus, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChatAiControls } from "@/components/chat/ChatAiControls";
import { ChatMessageMarkdown } from "@/components/chat/ChatMessageMarkdown";
import { getBackendBaseUrl } from "@/api/config";
import { useEditorStore } from "@/state/store";
import type { ChatConversationTab, ChatMessage, Patch } from "@/types";
import type { LocalAiSelection } from "@/types/electron-api";

type ChatPanelProps = {
  messages: ChatMessage[];
  files: Record<string, string>;
  activeFile: string;
  onPatchReceived: (patch: Patch) => void;
  onMessage: (message: ChatMessage) => void;
  conversationTabs: ChatConversationTab[];
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
  activeConversationTabId,
  onOpenConversationTab,
  onCloseConversationTab,
  onSetActiveConversationTab,
  onRenameConversationTab,
  aiSelection,
  onAiSelectionChange,
}: ChatPanelProps) {
  const locale = useEditorStore((s) => s.locale);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [tabsMenuOpen, setTabsMenuOpen] = useState(false);

  const activeTab = conversationTabs.find((tab) => tab.id === activeConversationTabId) ?? conversationTabs[0];

  const startRename = (tabId?: string) => {
    const target = tabId
      ? conversationTabs.find((tab) => tab.id === tabId)
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

  const handleSubmit = useCallback(
    async (promptText: string) => {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: promptText,
        timestamp: new Date().toISOString(),
      };
      onMessage(userMessage);

      if (typeof window !== "undefined" && window.electronApi) {
        const api = window.electronApi;
        if (!api.workspaceChatSend) {
          onMessage({
            id: crypto.randomUUID(),
            role: "system",
            content:
              locale === "pt"
                ? "O assistente de IA local não está disponível nesta versão do app."
                : "Local AI assistant is not available in this app version.",
            timestamp: new Date().toISOString(),
          });
          return;
        }
        const response = await api.workspaceChatSend({
          sessionKey: activeConversationTabId,
          activeFile,
          files,
          prompt: promptText,
          aiSelection,
        });
        onMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.reply || "(sem resposta)",
          timestamp: new Date().toISOString(),
        });
        if (response.patch) {
          onPatchReceived(response.patch as Patch);
        }
        return;
      }

      const backendUrl = getBackendBaseUrl();
      if (!backendUrl) {
        onMessage({
          id: crypto.randomUUID(),
          role: "system",
          content:
            locale === "pt"
              ? "Nenhum servidor de IA configurado. Os dados são locais; defina VITE_BACKEND_URL apenas se usar um backend HTTP."
              : "No AI server configured. Data stays local; set VITE_BACKEND_URL only if you use an HTTP backend.",
          timestamp: new Date().toISOString(),
        });
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
    },
    [activeConversationTabId, activeFile, files, aiSelection, locale, onMessage, onPatchReceived],
  );

  const handleSystemMessage = useCallback(
    (content: string) => {
      onMessage({
        id: crypto.randomUUID(),
        role: "system",
        content,
        timestamp: new Date().toISOString(),
      });
    },
    [onMessage],
  );

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-zinc-200 bg-[#fefefe] dark:border-zinc-700 dark:bg-zinc-950">
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
              {conversationTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`flex w-full items-center px-2 py-1 text-left text-xs ${
                    tab.id === activeConversationTabId
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                  onClick={() => {
                    onSetActiveConversationTab(tab.id);
                    setTabsMenuOpen(false);
                  }}
                >
                  <span className="truncate">{tab.title}</span>
                </button>
              ))}
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
      <ScrollArea className="min-h-0 flex-1 px-3 py-2">
        <div className="space-y-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-md px-3 py-2 text-sm ${
                message.role === "user"
                  ? "bg-zinc-900 text-white dark:bg-zinc-700 dark:text-zinc-100"
                  : message.role === "assistant"
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
              }`}
            >
              <ChatMessageMarkdown
                content={message.content}
                variant={
                  message.role === "user"
                    ? "user"
                    : message.role === "assistant"
                      ? "assistant"
                      : "system"
                }
              />
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="border-t border-zinc-200 bg-[#fefefe] p-3 dark:border-zinc-700 dark:bg-zinc-950">
        <ChatAiControls
          selection={aiSelection}
          onSelectionChange={onAiSelectionChange}
          placeholder="Describe requested patch..."
          onSubmit={handleSubmit}
          onSystemMessage={handleSystemMessage}
        />
      </div>
    </div>
  );
}
