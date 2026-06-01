export function ChatThinkingIndicator({ locale }: { locale: string }) {
  return (
    <div
      className="flex items-center gap-2 py-0.5 text-sm text-[var(--ui-chat-thinking-fg)]"
      role="status"
      aria-live="polite"
      aria-label={locale === "pt" ? "Pensando" : "Thinking"}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ui-chat-thinking-indicator)] opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--ui-chat-thinking-indicator)]" />
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
