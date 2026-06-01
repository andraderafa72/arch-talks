import type { UiLocale } from "@/types";
import { settingsStrings } from "@/lib/uiCopy";
import {
  DEFAULT_SETTINGS_PATH,
  SETTINGS_BASE_PATH,
  SETTINGS_SECTION_PATHS,
  isSettingsPath,
  listSettingsSectionPaths,
} from "../../../../../shared/settingsRoutes.ts";

export type SettingsSectionId =
  | "general"
  | "system-prompts"
  | "system-design"
  | "latex"
  | "vault"
  | "markdown-pdf"
  | "uml-render"
  | "latex-tectonic"
  | "daily-reports";

export type SettingsSectionRoute = {
  id: SettingsSectionId;
  segment: string;
  path: string;
  label: (locale: UiLocale) => string;
};

const SECTION_META: Array<{ id: SettingsSectionId; segment: string; labelKey: keyof ReturnType<typeof settingsStrings> }> = [
  { id: "general", segment: "general", labelKey: "navGeneral" },
  { id: "system-prompts", segment: "system-prompts", labelKey: "navSystemPrompts" },
  { id: "system-design", segment: "system-design", labelKey: "navSystemDesign" },
  { id: "latex", segment: "latex", labelKey: "navLatex" },
  { id: "vault", segment: "vault", labelKey: "navVault" },
  { id: "markdown-pdf", segment: "markdown-pdf", labelKey: "navMarkdownPdf" },
  { id: "uml-render", segment: "uml-render", labelKey: "navUmlRender" },
  { id: "latex-tectonic", segment: "latex-tectonic", labelKey: "navLatexTectonic" },
  { id: "daily-reports", segment: "daily-reports", labelKey: "navDailyReports" },
];

export const SETTINGS_SECTION_ROUTES: SettingsSectionRoute[] = SECTION_META.map((item, index) => ({
  id: item.id,
  segment: item.segment,
  path: SETTINGS_SECTION_PATHS[index]!,
  label: (locale) => settingsStrings(locale)[item.labelKey],
}));

export {
  DEFAULT_SETTINGS_PATH,
  SETTINGS_BASE_PATH,
  isSettingsPath,
  listSettingsSectionPaths,
};
