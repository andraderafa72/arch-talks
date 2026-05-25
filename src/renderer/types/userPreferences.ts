import type { ThemeMode, UiLocale } from "@/types";

export type WorkspaceLayoutPreferences = {
  leftWidth: number;
  rightWidth: number;
  /** @deprecated No longer shown in UI; kept for preference migration. */
  bottomHeight: number;
  filesSidebarWidth: number;
};

export type UserPreferencesV1 = {
  version: 1;
  theme: ThemeMode;
  locale: UiLocale;
  lastRoute: string;
  activeConversationId: string;
  workspaceLayout: WorkspaceLayoutPreferences;
};

export const DEFAULT_WORKSPACE_LAYOUT: WorkspaceLayoutPreferences = {
  leftWidth: 680,
  rightWidth: 380,
  bottomHeight: 0,
  filesSidebarWidth: 220,
};

export const DEFAULT_USER_PREFERENCES: UserPreferencesV1 = {
  version: 1,
  theme: "light",
  locale: "en",
  lastRoute: "/",
  activeConversationId: "",
  workspaceLayout: DEFAULT_WORKSPACE_LAYOUT,
};

export const VALID_APP_ROUTES = [
  "/",
  "/workspace",
  "/templates",
  "/conversations",
  "/skills/vaults",
  "/tools/markdown-pdf",
  "/tools/uml-render",
  "/tools/latex-tectonic",
] as const;

export type AppRoute = (typeof VALID_APP_ROUTES)[number];

export function normalizeAppRoute(route: string | undefined): AppRoute {
  if (route && (VALID_APP_ROUTES as readonly string[]).includes(route)) {
    return route as AppRoute;
  }
  return "/";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseWorkspaceLayout(value: unknown): WorkspaceLayoutPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_WORKSPACE_LAYOUT;
  }
  const layout = value as Record<string, unknown>;
  return {
    leftWidth: clamp(typeof layout.leftWidth === "number" ? layout.leftWidth : DEFAULT_WORKSPACE_LAYOUT.leftWidth, 420, 900),
    rightWidth: clamp(typeof layout.rightWidth === "number" ? layout.rightWidth : DEFAULT_WORKSPACE_LAYOUT.rightWidth, 300, 700),
    bottomHeight: clamp(
      typeof layout.bottomHeight === "number" ? layout.bottomHeight : DEFAULT_WORKSPACE_LAYOUT.bottomHeight,
      0,
      420,
    ),
    filesSidebarWidth: clamp(
      typeof layout.filesSidebarWidth === "number"
        ? layout.filesSidebarWidth
        : DEFAULT_WORKSPACE_LAYOUT.filesSidebarWidth,
      120,
      480,
    ),
  };
}

export function parseUserPreferences(raw: unknown): UserPreferencesV1 {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return DEFAULT_USER_PREFERENCES;
  }
  const value = raw as Record<string, unknown>;
  const theme = value.theme === "dark" ? "dark" : "light";
  const locale = value.locale === "pt" ? "pt" : "en";
  const activeConversationId = typeof value.activeConversationId === "string" ? value.activeConversationId : "";
  const lastRoute = normalizeAppRoute(typeof value.lastRoute === "string" ? value.lastRoute : undefined);
  return {
    version: 1,
    theme,
    locale,
    lastRoute,
    activeConversationId,
    workspaceLayout: parseWorkspaceLayout(value.workspaceLayout),
  };
}

export function mergeUserPreferences(
  current: UserPreferencesV1,
  patch: Partial<UserPreferencesV1>,
): UserPreferencesV1 {
  return parseUserPreferences({
    ...current,
    ...patch,
    workspaceLayout: patch.workspaceLayout
      ? { ...current.workspaceLayout, ...patch.workspaceLayout }
      : current.workspaceLayout,
    version: 1,
  });
}
