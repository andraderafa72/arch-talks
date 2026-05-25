import { applyChatAndVaultThemeVars } from "./applyUiThemeChat";
import type { ThemeMode } from "@/types";
import type { UiThemePalette, UiThemeV1 } from "@/types/uiTheme";

const CSS_VAR_KEYS: Array<{ key: keyof UiThemePalette | string; cssVar: string; get: (p: UiThemePalette) => string }> = [
  { key: "fontFamily", cssVar: "--ui-font-family", get: (p) => p.fontFamily },
  { key: "shell", cssVar: "--ui-shell-bg", get: (p) => p.shell.background },
  { key: "shell", cssVar: "--ui-shell-fg", get: (p) => p.shell.foreground },
  { key: "header", cssVar: "--ui-header-bg", get: (p) => p.header.background },
  { key: "header", cssVar: "--ui-header-border", get: (p) => p.header.border },
  { key: "header", cssVar: "--ui-header-fg", get: (p) => p.header.foreground },
  { key: "headerButton", cssVar: "--ui-header-btn-bg", get: (p) => p.headerButton.background },
  { key: "headerButton", cssVar: "--ui-header-btn-border", get: (p) => p.headerButton.border },
  { key: "headerButton", cssVar: "--ui-header-btn-fg", get: (p) => p.headerButton.foreground },
  { key: "headerButton", cssVar: "--ui-header-btn-hover-bg", get: (p) => p.headerButton.hoverBackground },
  { key: "headerButton", cssVar: "--ui-header-btn-active-bg", get: (p) => p.headerButton.activeBackground },
  { key: "headerButton", cssVar: "--ui-header-btn-active-border", get: (p) => p.headerButton.activeBorder },
  { key: "headerButton", cssVar: "--ui-header-btn-active-fg", get: (p) => p.headerButton.activeForeground },
  { key: "headerBadge", cssVar: "--ui-header-badge-bg", get: (p) => p.headerBadge.background },
  { key: "headerBadge", cssVar: "--ui-header-badge-border", get: (p) => p.headerBadge.border },
  { key: "headerBadge", cssVar: "--ui-header-badge-fg", get: (p) => p.headerBadge.foreground },
  { key: "popover", cssVar: "--ui-popover-bg", get: (p) => p.popover.background },
  { key: "popover", cssVar: "--ui-popover-border", get: (p) => p.popover.border },
  { key: "popover", cssVar: "--ui-popover-fg", get: (p) => p.popover.foreground },
  { key: "popover", cssVar: "--ui-popover-muted-fg", get: (p) => p.popover.mutedForeground },
  { key: "popover", cssVar: "--ui-popover-hover-bg", get: (p) => p.popover.hoverBackground },
  { key: "popover", cssVar: "--ui-popover-heading-fg", get: (p) => p.popover.headingForeground },
  { key: "popover", cssVar: "--ui-popover-divider-border", get: (p) => p.popover.dividerBorder },
  { key: "popover", cssVar: "--ui-popover-selected-fg", get: (p) => p.popover.selectedForeground },
  { key: "themeSwitch", cssVar: "--ui-theme-switch-track-bg", get: (p) => p.themeSwitch.trackBackground },
  { key: "themeSwitch", cssVar: "--ui-theme-switch-track-border", get: (p) => p.themeSwitch.trackBorder },
  { key: "themeSwitch", cssVar: "--ui-theme-switch-thumb-bg", get: (p) => p.themeSwitch.thumbBackground },
  { key: "themeSwitch", cssVar: "--ui-theme-switch-thumb-fg", get: (p) => p.themeSwitch.thumbForeground },
  { key: "sidebar", cssVar: "--ui-sidebar-bg", get: (p) => p.sidebar.background },
  { key: "sidebar", cssVar: "--ui-sidebar-border", get: (p) => p.sidebar.border },
  { key: "fileTree", cssVar: "--ui-file-tree-fg", get: (p) => p.fileTree.foreground },
  { key: "fileTree", cssVar: "--ui-file-tree-muted-fg", get: (p) => p.fileTree.mutedForeground },
  { key: "fileTree", cssVar: "--ui-file-tree-active-bg", get: (p) => p.fileTree.activeBackground },
  { key: "fileTree", cssVar: "--ui-file-tree-active-border", get: (p) => p.fileTree.activeBorder },
  { key: "fileTree", cssVar: "--ui-file-tree-selected-bg", get: (p) => p.fileTree.selectedBackground },
  { key: "fileTree", cssVar: "--ui-file-tree-hover-bg", get: (p) => p.fileTree.hoverBackground },
  { key: "panel", cssVar: "--ui-panel-bg", get: (p) => p.panel.background },
  { key: "panel", cssVar: "--ui-panel-border", get: (p) => p.panel.border },
  { key: "editor", cssVar: "--ui-editor-bg", get: (p) => p.editor.background },
  { key: "editor", cssVar: "--ui-editor-fg", get: (p) => p.editor.foreground },
  { key: "preview", cssVar: "--ui-preview-bg", get: (p) => p.preview.background },
  { key: "muted", cssVar: "--ui-muted-fg", get: (p) => p.muted.foreground },
  { key: "border", cssVar: "--ui-border", get: (p) => p.border.default },
  { key: "scrollbar", cssVar: "--ui-scrollbar-thumb", get: (p) => p.scrollbar.thumb },
  { key: "scrollbar", cssVar: "--ui-scrollbar-thumb-hover", get: (p) => p.scrollbar.thumbHover },
];

export function applyUiThemePalette(palette: UiThemePalette): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const { cssVar, get } of CSS_VAR_KEYS) {
    root.style.setProperty(cssVar, get(palette));
  }
  applyChatAndVaultThemeVars(palette);
}

export function applyUiTheme(theme: UiThemeV1, mode: ThemeMode): void {
  const palette = mode === "dark" ? theme.dark : theme.light;
  applyUiThemePalette(palette);
}
