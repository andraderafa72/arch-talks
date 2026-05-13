import { memo } from "react";
import { MarkdownMath, type MarkdownMathTone } from "@/components/markdown/MarkdownMath";

export type ChatMessageMarkdownVariant = Extract<MarkdownMathTone, "user" | "assistant" | "system">;

type ChatMessageMarkdownProps = {
  content: string;
  variant: ChatMessageMarkdownVariant;
};

export const ChatMessageMarkdown = memo(function ChatMessageMarkdown({
  content,
  variant,
}: ChatMessageMarkdownProps) {
  return <MarkdownMath content={content} tone={variant} className="chat-markdown text-sm" />;
});
