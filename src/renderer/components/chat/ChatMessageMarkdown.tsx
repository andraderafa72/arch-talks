import { memo } from "react";
import { MarkdownMath, type MarkdownMathTone } from "@/components/markdown/MarkdownMath";

export type ChatMessageMarkdownVariant = Extract<
  MarkdownMathTone,
  "user" | "assistant" | "system" | "system-info" | "system-warning" | "system-error"
>;

type ChatMessageMarkdownProps = {
  content: string;
  variant: ChatMessageMarkdownVariant;
  className?: string;
};

export const ChatMessageMarkdown = memo(function ChatMessageMarkdown({
  content,
  variant,
  className = "chat-markdown text-sm",
}: ChatMessageMarkdownProps) {
  return <MarkdownMath content={content} tone={variant} className={className} />;
});
