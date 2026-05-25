import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

export type MarkdownMathTone =
  | "user"
  | "assistant"
  | "system"
  | "system-info"
  | "system-warning"
  | "system-error"
  | "document";

function buildComponents(tone: MarkdownMathTone): Components {
  const linkClass =
    tone === "user"
      ? "text-sky-300 underline underline-offset-2 hover:text-sky-200"
      : tone === "system-error"
        ? "text-red-800 underline underline-offset-2 dark:text-red-200"
        : tone === "system-warning"
          ? "text-amber-900 underline underline-offset-2 dark:text-amber-200"
          : tone === "system" || tone === "system-info"
            ? "text-slate-700 underline underline-offset-2 dark:text-slate-200"
            : "text-blue-700 underline underline-offset-2 dark:text-blue-300";

  return {
    p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
    ul: ({ children }) => <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>,
    ol: ({ children }) => <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>,
    li: ({ children }) => <li className="mb-1">{children}</li>,
    h1: ({ children }) => <h1 className="mb-2 text-lg font-semibold">{children}</h1>,
    h2: ({ children }) => <h2 className="mb-2 text-base font-semibold">{children}</h2>,
    h3: ({ children }) => <h3 className="mb-2 text-sm font-semibold">{children}</h3>,
    blockquote: ({ children }) => (
      <blockquote className="mb-2 border-l-2 border-zinc-400 pl-3 italic dark:border-zinc-500">{children}</blockquote>
    ),
    a: ({ children, href }) => (
      <a className={linkClass} href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    hr: () => <hr className="my-3 border-zinc-300 dark:border-zinc-600" />,
    table: ({ children }) => (
      <div className="mb-2 max-w-full overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-zinc-200/60 dark:bg-zinc-800/60">{children}</thead>,
    th: ({ children }) => (
      <th className="border border-zinc-300 px-2 py-1 font-medium dark:border-zinc-600">{children}</th>
    ),
    td: ({ children }) => <td className="border border-zinc-300 px-2 py-1 dark:border-zinc-600">{children}</td>,
    tr: ({ children }) => <tr>{children}</tr>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    pre: ({ children }) => (
      <pre className="mb-2 max-w-full overflow-x-auto whitespace-pre-wrap rounded-md bg-zinc-900 p-2 font-mono text-xs text-zinc-100 dark:bg-zinc-950">
        {children}
      </pre>
    ),
    code: ({ className, children, ...props }) => {
      if (className?.startsWith("language-")) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }
      return (
        <code
          className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[0.85em] break-all dark:bg-zinc-700/80"
          {...props}
        >
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
