import { memo, useCallback } from "react";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { usePlantUmlPreview } from "@/hooks/usePlantUmlPreview";

export type MarkdownToPdfTheme = "light" | "dark";

export type PdfPalette = {
  accent: string;
  background: string;
  border: string;
  codeBackground: string;
  codeText: string;
  heading: string;
  inlineCodeBackground: string;
  link: string;
  mutedBackground: string;
  mutedText: string;
  quoteBorder: string;
  quoteBackground: string;
  text: string;
};

export const PDF_PALETTES: Record<MarkdownToPdfTheme, PdfPalette> = {
  light: {
    accent: "#2563eb",
    background: "#fefefe",
    border: "#cecece",
    codeBackground: "#18181b",
    codeText: "#f4f4f5",
    heading: "#0f172a",
    inlineCodeBackground: "#e4e4e7",
    link: "#1d4ed8",
    mutedBackground: "#f4f4f5",
    mutedText: "#52525b",
    quoteBorder: "#a1a1aa",
    quoteBackground: "#f8fafc",
    text: "#18181b",
  },
  dark: {
    accent: "#60a5fa",
    background: "transparent",
    border: "#3f3f46",
    codeBackground: "#09090b",
    codeText: "#f4f4f5",
    heading: "#fafafa",
    inlineCodeBackground: "#3f3f46",
    link: "#93c5fd",
    mutedBackground: "#27272a",
    mutedText: "#d4d4d8",
    quoteBorder: "#71717a",
    quoteBackground: "#27272a",
    text: "#f4f4f5",
  },
};

export const markdownPlugins = [remarkGfm];

export const PRINT_ROOT_ID = "markdown-pdf-print-root";
export const PRINT_MODE_CLASS = "markdown-pdf-print-mode";
export const PRINT_CSS = `
@page { size: A4; margin: 20mm 15mm 25mm 15mm; }
html, body { margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; line-height: 1.5; color: #111; background: #fefefe; }
.document { width: 180mm; margin: 0 auto; }
.markdown-doc { font-size: 15px; color: #111; background: #fefefe; }
.markdown-doc h1,.markdown-doc h2,.markdown-doc h3,.markdown-doc h4 {
  break-after: avoid; page-break-after: avoid; line-height: 1.25; margin: 0 0 10px; font-weight: 700;
}
.markdown-doc h1 { font-size: 2rem; margin-bottom: 14px; border-bottom: 1px solid #d4d4d4; padding-bottom: 6px; font-weight: 800; }
.markdown-doc h2 { font-size: 1.5rem; margin-top: 20px; font-weight: 700; }
.markdown-doc h3 { font-size: 1.2rem; margin-top: 16px; font-weight: 700; }
.markdown-doc h4 { font-size: 1rem; margin-top: 14px; text-transform: uppercase; letter-spacing: .02em; font-weight: 700; }
.markdown-doc p,.markdown-doc li { orphans: 3; widows: 3; }
.markdown-doc p { margin: 0 0 12px; }
.markdown-doc ul,.markdown-doc ol { margin: 0 0 12px 24px; padding-left: 18px; list-style-position: outside; }
.markdown-doc ul { list-style-type: disc; }
.markdown-doc ol { list-style-type: decimal; }
.markdown-doc ul.contains-task-list { list-style-type: none; }
.markdown-doc li.task-list-item { list-style: none; }
.markdown-doc ul:has(> li > input[type="checkbox"]) { list-style-type: none; }
.markdown-doc li:has(> input[type="checkbox"]) { list-style: none; }
.markdown-doc li { margin-bottom: 6px; }
.markdown-doc strong,.markdown-doc b { font-weight: 700; }
.markdown-doc a { color: #0f4ec7; text-decoration: underline; }
.markdown-doc hr { border: 0; border-top: 1px solid #d4d4d8; margin: 20px 0; }
.markdown-doc blockquote {
  margin: 0 0 14px; padding: 10px 14px 3px; border-left: 4px solid #9ca3af; background: #f5f5f5;
}
.markdown-doc .table-wrapper { overflow-x: hidden; margin: 0 0 16px; }
.markdown-doc table {
  width: 100%; border-collapse: collapse; table-layout: fixed;
  break-inside: avoid; page-break-inside: avoid;
}
.markdown-doc thead { display: table-header-group; }
.markdown-doc tfoot { display: table-footer-group; }
.markdown-doc tr { break-inside: avoid; page-break-inside: avoid; }
.markdown-doc th,.markdown-doc td { border: 1px solid #d4d4d8; padding: 7px 8px; vertical-align: top; text-align: left; }
.markdown-doc pre,.markdown-doc blockquote,.markdown-doc img,.markdown-doc figure,.markdown-doc .code-block,.markdown-doc .avoid-break {
  break-inside: avoid; page-break-inside: avoid;
}
.markdown-doc pre {
  white-space: pre-wrap; overflow-wrap: break-word; word-break: break-word;
  background: #111827; color: #f3f4f6; border-radius: 8px; padding: 12px; margin: 0 0 14px; font-size: 12px;
}
.markdown-doc code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.markdown-doc p code,.markdown-doc li code {
  background: #e5e7eb; border-radius: 4px; padding: 1px 4px;
}
.markdown-doc figure { margin: 0 0 14px; }
.markdown-doc img {
  max-width: 100%; height: auto; display: block; border-radius: 8px;
}
.page-break { break-before: page; page-break-before: always; }
.uml-diagram { margin: 16px 0; }
`;

export const PRINT_MODE_STYLE = `
@media print {
  body.${PRINT_MODE_CLASS} > * {
    display: none !important;
  }
  body.${PRINT_MODE_CLASS} > #${PRINT_ROOT_ID} {
    display: block !important;
    position: static !important;
    inset: auto !important;
    width: auto !important;
    height: auto !important;
    overflow: visible !important;
    visibility: visible !important;
    background: #fff !important;
  }
}
`;

function isUmlLanguage(className?: string): boolean {
  if (!className) return false;
  const lang = className.replace("language-", "").toLowerCase();
  return ["uml", "plantuml", "puml"].includes(lang);
}

const MemoizedUmlDiagramBlock = memo(UmlDiagramBlock);
function UmlDiagramBlock({
  source,
  palette,
}: {
  source: string;
  palette: PdfPalette;
}) {
  const { previewUrl, loading, error } = usePlantUmlPreview(source, { enabled: source.trim().length > 0, debounceMs: 300 });
  const setFigureRef = useCallback((el: HTMLElement | null) => {
    const parent = el?.parentElement;
    if (!parent) return;
    parent.style.backgroundColor = "transparent";
    parent.style.padding = "0";
    parent.style.border = "none";
  }, []);

  if (error) {return <p>Error loading UML: {error}</p>}
  if (loading) {return <p>Loading UML…</p>}

  if (!previewUrl) {
    return (
      <pre
        className="code-block avoid-break"
        style={{ backgroundColor: palette.codeBackground, color: palette.codeText }}
      >
        <code>{source}</code>
      </pre>
    );
  }

  return (
    <figure ref={setFigureRef} className="uml-diagram avoid-break">
      <img src={previewUrl} alt="UML diagram" />
    </figure>
  );
}

export function createDocumentMarkdownComponents(palette: PdfPalette): Components {
  return {
    h1: ({ children }) => <h1>{children}</h1>,
    h2: ({ children }) => <h2>{children}</h2>,
    h3: ({ children }) => <h3>{children}</h3>,
    h4: ({ children }) => <h4>{children}</h4>,
    p: ({ children }) => <p>{children}</p>,
    a: ({ children, href }) => (
      <a href={href} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote
        className="avoid-break"
        style={{
          backgroundColor: palette.quoteBackground,
          borderLeft: `5px solid ${palette.accent}`,
          borderRadius: 8,
          color: palette.mutedText,
        }}
      >
        {children}
      </blockquote>
    ),
    ul: ({ children, ...props }) => <ul {...props}>{children}</ul>,
    ol: ({ children, ...props }) => <ol {...props}>{children}</ol>,
    li: ({ children, ...props }) => <li {...props}>{children}</li>,
    hr: () => <hr />,
    table: ({ children }) => (
      <div className="table-wrapper avoid-break">
        <table>{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead style={{ backgroundColor: palette.mutedBackground }}>{children}</thead>,
    th: ({ children }) => (
      <th style={{ borderColor: palette.border, color: palette.heading, fontWeight: 700 }}>{children}</th>
    ),
    td: ({ children }) => <td style={{ borderColor: palette.border }}>{children}</td>,
    pre: ({ children }) => (
      <pre
        className="code-block avoid-break"
        style={{ backgroundColor: palette.codeBackground, color: palette.codeText }}
      >
        {children}
      </pre>
    ),
    code: ({ className, children, ...props }) => {
      const isBlock = Boolean(className?.includes("language-"));
      if (isBlock) {
        const source = String(children).replace(/\n$/, "");
        if (isUmlLanguage(className)) {
          return <MemoizedUmlDiagramBlock source={source} palette={palette} />;
        }
        return (
          <code className={className} style={{ color: palette.codeText }} {...props}>
            {children}
          </code>
        );
      }
      return (
        <code style={{ backgroundColor: palette.inlineCodeBackground }} {...props}>
          {children}
        </code>
      );
    },
    img: ({ alt, src }) => (
      <figure className="avoid-break">
        <img alt={alt ?? ""} src={src ?? ""} />
      </figure>
    ),
    input: ({ checked, type, ...props }) => <input checked={checked} readOnly type={type} {...props} />,
  };
}
