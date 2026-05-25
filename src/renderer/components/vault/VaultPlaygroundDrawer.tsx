import { FlaskConical, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { ChatAiControls } from "@/components/chat/ChatAiControls";
import { ChatMessageMarkdown } from "@/components/chat/ChatMessageMarkdown";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVaultPlaygroundContext } from "@/contexts/VaultPlaygroundContext";
import { extractVaultNotePaths } from "@/lib/extractVaultNotePaths";
import { vaultPlaygroundStrings } from "@/lib/uiCopy";
import { useEditorStore } from "@/state/store";

type VaultPlaygroundDrawerProps = {
  activeFile: string;
  knownPaths: string[];
};

function tabBasename(path: string) {
  const index = path.lastIndexOf("/");
  return index >= 0 ? path.slice(index + 1) : path;
}

export function VaultPlaygroundOpenButton() {
  const locale = useEditorStore((state) => state.locale);
  const copy = vaultPlaygroundStrings(locale);
  const { isOpen, open } = useVaultPlaygroundContext();

  return (
    <Button type="button" size="sm" variant={isOpen ? "default" : "secondary"} onClick={open}>
      <FlaskConical className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
      {copy.openButton}
    </Button>
  );
}

export function VaultPlaygroundDrawer({ activeFile, knownPaths }: VaultPlaygroundDrawerProps) {
  const locale = useEditorStore((state) => state.locale);
  const copy = vaultPlaygroundStrings(locale);
  const {
    isOpen,
    close,
    messages,
    skills,
    skillsLoading,
    selectedSkillId,
    setSelectedSkillId,
    activeAiSelection,
    setActiveAiSelection,
    isSending,
    streamingAssistantText,
    sendMessage,
    stopMessage,
    clearMessages,
    navigateToFile,
  } = useVaultPlaygroundContext();

  const streamEndRef = useRef<HTMLDivElement | null>(null);
  const knownPathSet = useMemo(() => new Set(knownPaths), [knownPaths]);

  useEffect(() => {
    if (!isSending && streamingAssistantText == null) return;
    streamEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isSending, streamingAssistantText, messages.length]);

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        className="absolute inset-0 z-20 cursor-default border-0 bg-black/20 p-0 dark:bg-black/40"
        onClick={close}
        tabIndex={-1}
        aria-label={copy.close}
      />
      <aside
        className="absolute inset-y-0 right-0 z-30 flex w-[min(100%,28rem)] flex-col border-l border-zinc-200 bg-[#fefefe] shadow-2xl dark:border-zinc-700 dark:bg-zinc-950"
        role="dialog"
        aria-modal="true"
        aria-label={copy.title}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{copy.title}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{copy.subtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7"
              onClick={clearMessages}
              disabled={messages.length === 0 || isSending}
              aria-label={copy.clearChat}
              title={copy.clearChat}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7"
              onClick={close}
              aria-label={copy.close}
              title={copy.close}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
          <label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {copy.skillLabel}
          </label>
          <Select
            value={selectedSkillId}
            onValueChange={setSelectedSkillId}
            disabled={skillsLoading || isSending}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={copy.skillLabel} />
            </SelectTrigger>
            <SelectContent>
              {skills.map((skill) => (
                <SelectItem key={skill.id} value={skill.id} className="text-xs">
                  {skill.name}
                  {skill.builtin ? copy.builtinSkillSuffix : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            {copy.activeFile}: {activeFile ? tabBasename(activeFile) : copy.noActiveFile}
          </p>
        </div>

        <ScrollArea className="min-h-0 flex-1 px-3 py-2">
          {messages.length === 0 && !isSending ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{copy.emptyHint}</p>
          ) : null}
          {messages.map((message) => {
            const notePaths =
              message.role === "assistant"
                ? extractVaultNotePaths(message.content, knownPathSet)
                : [];
            return (
              <div key={message.id} className="mb-3">
                <div
                  className={`rounded-md px-3 py-2 text-sm ${
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
                {notePaths.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {notePaths.map((path) => (
                      <button
                        key={`${message.id}:${path}`}
                        type="button"
                        className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        onClick={() => navigateToFile(path)}
                        title={path}
                      >
                        {copy.openNote}: {tabBasename(path)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
          {streamingAssistantText !== null ? (
            <div
              className="mb-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800/60"
              aria-busy={isSending}
              aria-live="polite"
            >
              {streamingAssistantText.length > 0 ? (
                <ChatMessageMarkdown content={streamingAssistantText} variant="assistant" />
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">…</p>
              )}
            </div>
          ) : null}
          <div ref={streamEndRef} />
        </ScrollArea>

        <div className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-700">
          <p className="mb-2 text-[11px] text-zinc-500 dark:text-zinc-400">{copy.footerHint}</p>
          <ChatAiControls
            selection={activeAiSelection}
            onSelectionChange={setActiveAiSelection}
            placeholder={copy.placeholder}
            onSubmit={sendMessage}
            onStop={stopMessage}
          />
        </div>
      </aside>
    </>
  );
}
