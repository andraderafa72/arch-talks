import { useCallback, type RefObject } from "react";
import {
  ChatMessageMarkdown,
  type ChatMessageMarkdownVariant,
} from "@/components/chat/ChatMessageMarkdown";
import { useStreamingTextReveal } from "@/hooks/useStreamingTextReveal";

export type StreamingChatMessageProps = {
  content: string;
  variant: ChatMessageMarkdownVariant;
  className?: string;
  streamId: string;
  isStreaming: boolean;
  scrollAnchorRef?: RefObject<HTMLElement | null>;
};

export function StreamingChatMessage({
  content,
  variant,
  className,
  streamId,
  isStreaming,
  scrollAnchorRef,
}: StreamingChatMessageProps) {
  const scrollToAnchor = useCallback(() => {
    scrollAnchorRef?.current?.scrollIntoView({ block: "end", behavior: "auto" });
  }, [scrollAnchorRef]);

  const { displayedText, isAnimating } = useStreamingTextReveal({
    text: content,
    streamId,
    enabled: isStreaming,
    onReveal: scrollAnchorRef ? scrollToAnchor : undefined,
  });

  return (
    <div className="inline-flex min-w-0 max-w-full items-end gap-0.5">
      <ChatMessageMarkdown content={displayedText} variant={variant} className={className} />
      {isStreaming && isAnimating ? (
        <span
          aria-hidden
          className="mb-0.5 inline-block h-[1em] w-[2px] shrink-0 animate-pulse bg-current opacity-80"
        />
      ) : null}
    </div>
  );
}
