import { getPersistenceProvider } from "@/persistence/createPersistenceProvider";
import type { PersistenceProvider } from "@/persistence/ports/storageProvider";
import { parseCustomUiThemes } from "@/lib/themeRegistry";
import type { UiThemeV1 } from "@/types/uiTheme";

export class UiThemePersistenceService {
  private get provider(): PersistenceProvider {
    return getPersistenceProvider();
  }

  async listThemes(): Promise<UiThemeV1[]> {
    return this.provider.uiThemes.listThemes();
  }

  async saveTheme(theme: UiThemeV1, previousId?: string): Promise<void> {
    if (previousId && previousId !== theme.id) {
      await this.provider.uiThemes.deleteTheme(previousId);
    }
    await this.provider.uiThemes.writeTheme(theme);
  }

  async deleteTheme(id: string): Promise<void> {
    await this.provider.uiThemes.deleteTheme(id);
  }

  async migrateEmbeddedThemes(rawThemes: unknown[]): Promise<number> {
    const themes = parseCustomUiThemes(rawThemes);
    if (themes.length === 0) return 0;
    return this.provider.uiThemes.migrateEmbeddedThemes(themes);
  }
}

export const uiThemePersistenceService = new UiThemePersistenceService();
