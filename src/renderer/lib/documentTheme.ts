import { applyUiTheme } from "@/lib/applyUiTheme";
import { getThemeById } from "@/lib/themeRegistry";
import type { ThemeMode } from "@/types";
import type { UiThemeV1 } from "@/types/uiTheme";

export type ApplyDocumentThemeOptions = {
  theme: UiThemeV1;
  mode: ThemeMode;
};

export function applyDocumentTheme(mode: ThemeMode, uiTheme: UiThemeV1): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.classList.toggle("theme-dark", mode === "dark");
  root.classList.toggle("theme-light", mode === "light");
  applyUiTheme(uiTheme, mode);
}

export function applyDocumentThemeFromId(
  mode: ThemeMode,
  uiThemeId: string,
  customUiThemes: UiThemeV1[] = [],
): void {
  const theme = getThemeById(uiThemeId, customUiThemes);
  applyDocumentTheme(mode, theme);
}
