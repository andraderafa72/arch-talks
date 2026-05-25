import defaultPreset from "../themes/presets/default.json";
import nordPreset from "../themes/presets/nord.json";
import orangePreset from "../themes/presets/orange.json";
import solarizedPreset from "../themes/presets/solarized.json";
import { DEFAULT_UI_THEME_ID } from "@/lib/uiThemeConstants";
import { parseUiTheme, type UiThemeV1 } from "@/types/uiTheme";

export { normalizeUiThemeId } from "@/lib/normalizeUiThemeId";

export { DEFAULT_UI_THEME_ID } from "@/lib/uiThemeConstants";

const BUILT_IN_RAW = [defaultPreset, solarizedPreset, nordPreset, orangePreset] as const;

function loadBuiltInThemes(): UiThemeV1[] {
  const themes: UiThemeV1[] = [];
  for (const raw of BUILT_IN_RAW) {
    const result = parseUiTheme(raw);
    if (result.ok) {
      themes.push({ ...result.theme, builtIn: true });
    }
  }
  return themes;
}

const BUILT_IN_THEMES = loadBuiltInThemes();

export function getBuiltInThemes(): readonly UiThemeV1[] {
  return BUILT_IN_THEMES;
}

export function getBuiltInThemeById(id: string): UiThemeV1 | undefined {
  return BUILT_IN_THEMES.find((t) => t.id === id);
}

export function listThemes(customThemes: UiThemeV1[] = []): UiThemeV1[] {
  const customById = new Map(customThemes.map((t) => [t.id, t]));
  const builtInIds = new Set(BUILT_IN_THEMES.map((t) => t.id));
  const merged: UiThemeV1[] = [...BUILT_IN_THEMES];
  for (const custom of customById.values()) {
    if (!builtInIds.has(custom.id)) {
      merged.push(custom);
    }
  }
  return merged;
}

export function getThemeById(id: string, customThemes: UiThemeV1[] = []): UiThemeV1 {
  const custom = customThemes.find((t) => t.id === id);
  if (custom) return custom;
  const builtIn = getBuiltInThemeById(id);
  if (builtIn) return builtIn;
  return getBuiltInThemeById(DEFAULT_UI_THEME_ID) ?? BUILT_IN_THEMES[0]!;
}

export function parseCustomUiThemes(raw: unknown): UiThemeV1[] {
  if (!Array.isArray(raw)) return [];
  const themes: UiThemeV1[] = [];
  for (const item of raw) {
    const result = parseUiTheme(item);
    if (result.ok && !result.theme.builtIn) {
      themes.push({ ...result.theme, builtIn: false });
    }
  }
  return themes;
}
