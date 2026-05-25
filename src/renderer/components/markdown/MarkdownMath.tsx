import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import {
  chatMarkdownCodeBlockClass,
  chatMarkdownCodeInlineClass,
  chatMarkdownLinkClass,
} from "@/lib/chatThemeClasses";

export type MarkdownMathTone =
  | "user"
  | "assistant"
  | "system"
  | "system-info"
  | "system-warning"
  | "system-error"
  | "document";

function buildComponents(tone: MarkdownMathTone): Components {
  const linkClass = chatMarkdownLinkClass(tone);

  return {
    p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
    ul: ({ children }) => <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>,
    ol: ({ children }) => <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>,
    li: ({ children }) => <li className="mb-1">{children}</li>,
    h1: ({ children }) => <h1 className="mb-2 text-lg font-semibold">{children}</h1>,
    h2: ({ children }) => <h2 className="mb-2 text-base font-semibold">{children}</h2>,
    h3: ({ children }) => <h3 className="mb-2 text-sm font-semibold">{children}</h3>,
    blockquote: ({ children }) => (
      <blockquote className="mb-2 border-l-2 border-[var(--ui-chat-md-blockquote-border)] pl-3 italic">
        {children}
      </blockquote>
    ),
    a: ({ children, href }) => (
      <a className={linkClass} href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    hr: () => <hr className="my-3 border-[var(--ui-chat-md-hr-border)]" />,
    table: ({ children }) => (
      <div className="mb-2 max-w-full overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-[var(--ui-chat-md-table-header-bg)]">{children}</thead>,
    th: ({ children }) => (
      <th className="border border-[var(--ui-chat-md-table-border)] px-2 py-1 font-medium">{children}</th>
    ),
    td: ({ children }) => <td className="border border-[var(--ui-chat-md-table-border)] px-2 py-1">{children}</td>,
    tr: ({ children }) => <tr>{children}</tr>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    pre: ({ children }) => <pre className={chatMarkdownCodeBlockClass(tone)}>{children}</pre>,
    code: ({ className, children, ...props }) => {
      if (className?.startsWith("language-")) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }
      return (
        <code className={chatMarkdownCodeInlineClass(tone)} {...props}>
          {children}
        </code>
      );
    },
  };
}

const remarkPlugins = [remarkGfm];

type MarkdownMathProps = {
  content: string;
  tone: MarkdownMathTone;
  className?: string;
};

export const MarkdownMath = memo(function MarkdownMath({ content, tone, className }: MarkdownMathProps) {
  const components = useMemo(() => buildComponents(tone), [tone]);

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {content ?? ""}
      </ReactMarkdown>
    </div>
  );
});
