const MARKDOWN_EXTENSIONS = [".md", ".markdown", ".mdx"] as const;

export function isMarkdownVaultPath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return MARKDOWN_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
