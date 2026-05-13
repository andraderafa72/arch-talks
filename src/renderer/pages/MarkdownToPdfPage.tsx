import { MarkdownToPdfTool } from "@/components/tools/MarkdownToPdfTool";
import type { ThemeMode } from "@/types";

type MarkdownToPdfPageProps = {
  theme: ThemeMode;
};

export function MarkdownToPdfPage({ theme }: MarkdownToPdfPageProps) {
  return <MarkdownToPdfTool theme={theme} />;
}
