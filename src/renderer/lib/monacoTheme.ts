import type { Monaco } from "@monaco-editor/react";
import type { UiThemePalette } from "@/types/uiTheme";
import type { ThemeMode } from "@/types";

export const RAG_TALKS_MONACO_THEME_ID = "rag-talks-custom";

export function defineRagTalksMonacoTheme(monaco: Monaco, palette: UiThemePalette, mode: ThemeMode): void {
  monaco.editor.defineTheme(RAG_TALKS_MONACO_THEME_ID, {
    base: mode === "dark" ? "vs-dark" : "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": palette.editor.background,
      "editor.foreground": palette.editor.foreground,
    },
  });
}
