import { getThemeById } from "@/lib/themeRegistry";
import { useEditorStore } from "@/state/store";
import type { UiThemePalette } from "@/types/uiTheme";

export function useActiveUiPalette(): UiThemePalette {
  const uiThemeId = useEditorStore((s) => s.uiThemeId);
  const customUiThemes = useEditorStore((s) => s.customUiThemes);
  const themeMode = useEditorStore((s) => s.theme);
  const uiTheme = getThemeById(uiThemeId, customUiThemes);
  return themeMode === "dark" ? uiTheme.dark : uiTheme.light;
}

export function useLightUiPalette(): UiThemePalette {
  const uiThemeId = useEditorStore((s) => s.uiThemeId);
  const customUiThemes = useEditorStore((s) => s.customUiThemes);
  return getThemeById(uiThemeId, customUiThemes).light;
}
