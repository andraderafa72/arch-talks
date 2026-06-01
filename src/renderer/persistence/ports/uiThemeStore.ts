import type { UiThemeV1 } from "@/types/uiTheme";

export interface UiThemeStore {
  listThemes(): Promise<UiThemeV1[]>;
  writeTheme(theme: UiThemeV1): Promise<void>;
  deleteTheme(id: string): Promise<void>;
  migrateEmbeddedThemes(themes: UiThemeV1[]): Promise<number>;
}
