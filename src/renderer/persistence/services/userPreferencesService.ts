import {
  DEFAULT_USER_PREFERENCES,
  mergeUserPreferences,
  parseUserPreferences,
  type UserPreferencesV1,
} from "@/types/userPreferences";

const BROWSER_STORAGE_KEY = "rag-talks-user-preferences";
const LEGACY_LOCALE_STORAGE_KEY = "rag-talks-ui-locale";
const SAVE_DEBOUNCE_MS = 400;

function migrateLegacyLocale(preferences: UserPreferencesV1): UserPreferencesV1 {
  if (typeof window === "undefined") return preferences;
  try {
    const legacy = window.localStorage.getItem(LEGACY_LOCALE_STORAGE_KEY);
    if (legacy !== "pt" && legacy !== "en") return preferences;
    if (preferences.locale === legacy) {
      window.localStorage.removeItem(LEGACY_LOCALE_STORAGE_KEY);
      return preferences;
    }
    if (preferences.locale === DEFAULT_USER_PREFERENCES.locale) {
      window.localStorage.removeItem(LEGACY_LOCALE_STORAGE_KEY);
      return mergeUserPreferences(preferences, { locale: legacy });
    }
  } catch {
    /* ignore */
  }
  return preferences;
}

export class UserPreferencesService {
  private cache: UserPreferencesV1 | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private loadPromise: Promise<UserPreferencesV1> | null = null;
  private hydrated = false;
  private persistEnabled = false;
  private pendingSave: UserPreferencesV1 | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", () => {
        this.flush();
      });
    }
  }

  isHydrated(): boolean {
    return this.hydrated;
  }

  enablePersist(): void {
    this.persistEnabled = true;
    this.flush();
  }

  async load(): Promise<UserPreferencesV1> {
    if (this.hydrated && this.cache) return this.cache;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      let raw: unknown = null;
      if (typeof window !== "undefined" && window.electronApi?.readUserPreferences) {
        raw = await window.electronApi.readUserPreferences();
      } else if (typeof window !== "undefined") {
        try {
          const stored = window.localStorage.getItem(BROWSER_STORAGE_KEY);
          if (stored) raw = JSON.parse(stored) as unknown;
        } catch {
          /* ignore */
        }
      }

      const parsed = migrateLegacyLocale(parseUserPreferences(raw));
      this.cache = parsed;
      this.hydrated = true;
      return parsed;
    })();

    try {
      return await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  getCached(): UserPreferencesV1 {
    return this.cache ?? DEFAULT_USER_PREFERENCES;
  }

  patch(partial: Partial<UserPreferencesV1>): UserPreferencesV1 {
    const next = mergeUserPreferences(this.getCached(), partial);
    this.cache = next;
    this.scheduleSave(next);
    return next;
  }

  flush(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (!this.pendingSave) return;
    const preferences = this.pendingSave;
    this.pendingSave = null;
    void this.persist(preferences);
  }

  private scheduleSave(preferences: UserPreferencesV1): void {
    this.pendingSave = preferences;
    if (!this.persistEnabled) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      const toSave = this.pendingSave;
      this.pendingSave = null;
      if (toSave) void this.persist(toSave);
    }, SAVE_DEBOUNCE_MS);
  }

  private async persist(preferences: UserPreferencesV1): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      if (window.electronApi?.writeUserPreferences) {
        const result = await window.electronApi.writeUserPreferences(preferences);
        if (!result.ok) {
          console.error(result.error);
        }
        return;
      }
      window.localStorage.setItem(BROWSER_STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error(error);
    }
  }
}

export const userPreferencesService = new UserPreferencesService();
