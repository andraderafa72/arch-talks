export const SETTINGS_BASE_PATH = "/configuration/settings";

export const SETTINGS_SECTION_PATHS = [
  `${SETTINGS_BASE_PATH}/general`,
  `${SETTINGS_BASE_PATH}/system-prompts`,
  `${SETTINGS_BASE_PATH}/system-design`,
  `${SETTINGS_BASE_PATH}/latex`,
  `${SETTINGS_BASE_PATH}/vault`,
  `${SETTINGS_BASE_PATH}/markdown-pdf`,
  `${SETTINGS_BASE_PATH}/uml-render`,
  `${SETTINGS_BASE_PATH}/latex-tectonic`,
  `${SETTINGS_BASE_PATH}/daily-reports`,
] as const;

export const DEFAULT_SETTINGS_PATH = SETTINGS_SECTION_PATHS[0];

export function isSettingsPath(pathname: string): boolean {
  return pathname === SETTINGS_BASE_PATH || pathname.startsWith(`${SETTINGS_BASE_PATH}/`);
}

export function listSettingsSectionPaths(): string[] {
  return [...SETTINGS_SECTION_PATHS];
}
