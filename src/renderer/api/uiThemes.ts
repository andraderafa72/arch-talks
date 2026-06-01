import { uiThemePersistenceService } from "@/persistence/services/uiThemePersistenceService";
import type { UiThemeV1 } from "@/types/uiTheme";

export async function listUiThemes(): Promise<UiThemeV1[]> {
  return uiThemePersistenceService.listThemes();
}

export async function saveUiTheme(theme: UiThemeV1, previousId?: string): Promise<void> {
  await uiThemePersistenceService.saveTheme(theme, previousId);
}

export async function deleteUiTheme(id: string): Promise<void> {
  await uiThemePersistenceService.deleteTheme(id);
}

export async function migrateEmbeddedUiThemes(rawThemes: unknown[]): Promise<number> {
  return uiThemePersistenceService.migrateEmbeddedThemes(rawThemes);
}
