import defaultPreset from "../themes/presets/default.json";
import nordPreset from "../themes/presets/nord.json";
import orangePreset from "../themes/presets/orange.json";
import solarizedPreset from "../themes/presets/solarized.json";
import { DEFAULT_UI_THEME_ID } from "./uiThemeConstants";
import { parseUiTheme, type UiThemeV1 } from "../types/uiTheme";

const BUILT_IN_RAW = [defaultPreset, solarizedPreset, nordPreset, orangePreset] as const;

function loadBuiltInThemeIds(): string[] {
  const ids: string[] = [];
  for (const raw of BUILT_IN_RAW) {
    const result = parseUiTheme(raw);
    if (result.ok) {
      ids.push(result.theme.id);
    }
  }
  return ids;
}

const BUILT_IN_THEME_IDS = loadBuiltInThemeIds();

/** Validates a palette theme id against bundled presets and user custom themes. */
export function normalizeUiThemeId(id: string | undefined, customThemes: UiThemeV1[] = []): string {
  if (!id) return DEFAULT_UI_THEME_ID;
  if (BUILT_IN_THEME_IDS.includes(id)) return id;
  if (customThemes.some((theme) => theme.id === id)) return id;
  return DEFAULT_UI_THEME_ID;
}

export function getKnownBuiltInThemeIds(): readonly string[] {
  return BUILT_IN_THEME_IDS;
}
