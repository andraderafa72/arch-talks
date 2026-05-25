import type {
  UiChatPalette,
  UiConfigScreenPalette,
  UiMarkdownPdfPreviewPalette,
  UiUmlRenderPreviewPalette,
  UiVaultPlaygroundPalette,
} from "../lib/uiThemeParseSections";
import {
  parseChatPalette,
  parseConfigScreenPalette,
  parseMarkdownPdfPreviewPalette,
  parseUmlRenderPreviewPalette,
  parseVaultPlaygroundPalette,
} from "../lib/uiThemeParseSections";

export type {
  UiChatPalette,
  UiConfigScreenPalette,
  UiMarkdownPdfPreviewPalette,
  UiUmlRenderPreviewPalette,
  UiVaultPlaygroundPalette,
} from "../lib/uiThemeParseSections";

export type UiThemePalette = {
  fontFamily: string;
  shell: { background: string; foreground: string };
  header: { background: string; border: string; foreground: string };
  headerButton: {
    background: string;
    border: string;
    foreground: string;
    hoverBackground: string;
    activeBackground: string;
    activeBorder: string;
    activeForeground: string;
  };
  headerBadge: { background: string; border: string; foreground: string };
  popover: {
    background: string;
    border: string;
    foreground: string;
    mutedForeground: string;
    hoverBackground: string;
    headingForeground: string;
    dividerBorder: string;
    selectedForeground: string;
  };
  themeSwitch: {
    trackBackground: string;
    trackBorder: string;
    thumbBackground: string;
    thumbForeground: string;
  };
  sidebar: { background: string; border: string };
  fileTree: {
    foreground: string;
    mutedForeground: string;
    activeBackground: string;
    activeBorder: string;
    selectedBackground: string;
    hoverBackground: string;
  };
  panel: { background: string; border: string };
  editor: { background: string; foreground: string };
  preview: { background: string };
  muted: { foreground: string };
  border: { default: string };
  scrollbar: { thumb: string; thumbHover: string };
  chat: UiChatPalette;
  vaultPlayground: UiVaultPlaygroundPalette;
  markdownPdfPreview: UiMarkdownPdfPreviewPalette;
  umlRenderPreview: UiUmlRenderPreviewPalette;
  configScreen: UiConfigScreenPalette;
};

export type UiThemeV1 = {
  version: 1;
  id: string;
  name: string;
  description?: string;
  builtIn?: boolean;
  light: UiThemePalette;
  dark: UiThemePalette;
};

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR.test(value.trim());
}

function parseColor(value: unknown): string | null {
  if (typeof value !== "string" || !isValidHexColor(value)) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 4) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return trimmed.toLowerCase();
}

function parseString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function parsePalette(value: unknown): UiThemePalette | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;

  const shell = p.shell as Record<string, unknown> | undefined;
  const header = p.header as Record<string, unknown> | undefined;
  const headerButton = p.headerButton as Record<string, unknown> | undefined;
  const headerBadge = p.headerBadge as Record<string, unknown> | undefined;
  const popover = p.popover as Record<string, unknown> | undefined;
  const themeSwitch = p.themeSwitch as Record<string, unknown> | undefined;
  const sidebar = p.sidebar as Record<string, unknown> | undefined;
  const fileTree = p.fileTree as Record<string, unknown> | undefined;
  const panel = p.panel as Record<string, unknown> | undefined;
  const editor = p.editor as Record<string, unknown> | undefined;
  const preview = p.preview as Record<string, unknown> | undefined;
  const muted = p.muted as Record<string, unknown> | undefined;
  const border = p.border as Record<string, unknown> | undefined;
  const scrollbar = p.scrollbar as Record<string, unknown> | undefined;

  const fontFamily = parseString(p.fontFamily, "Inter, system-ui, sans-serif");

  const shellBg = parseColor(shell?.background);
  const shellFg = parseColor(shell?.foreground);
  const headerBg = parseColor(header?.background);
  const headerBorder = parseColor(header?.border);
  const headerFg = parseColor(header?.foreground);
  const btnBg = parseColor(headerButton?.background);
  const btnBorder = parseColor(headerButton?.border);
  const btnFg = parseColor(headerButton?.foreground);
  const btnHoverBg = parseColor(headerButton?.hoverBackground);
  const btnActiveBg = parseColor(headerButton?.activeBackground);
  const btnActiveBorder = parseColor(headerButton?.activeBorder);
  const btnActiveFg = parseColor(headerButton?.activeForeground);
  const badgeBg = parseColor(headerBadge?.background);
  const badgeBorder = parseColor(headerBadge?.border);
  const badgeFg = parseColor(headerBadge?.foreground);
  const popoverBg = parseColor(popover?.background);
  const popoverBorder = parseColor(popover?.border);
  const popoverFg = parseColor(popover?.foreground);
  const popoverMutedFg = parseColor(popover?.mutedForeground);
  const popoverHoverBg = parseColor(popover?.hoverBackground);
  const popoverHeadingFg = parseColor(popover?.headingForeground);
  const popoverDividerBorder = parseColor(popover?.dividerBorder);
  const popoverSelectedFg = parseColor(popover?.selectedForeground);
  const switchTrackBg = parseColor(themeSwitch?.trackBackground);
  const switchTrackBorder = parseColor(themeSwitch?.trackBorder);
  const switchThumbBg = parseColor(themeSwitch?.thumbBackground);
  const switchThumbFg = parseColor(themeSwitch?.thumbForeground);
  const sidebarBg = parseColor(sidebar?.background);
  const sidebarBorder = parseColor(sidebar?.border);
  const ftFg = parseColor(fileTree?.foreground);
  const ftMuted = parseColor(fileTree?.mutedForeground);
  const ftActiveBg = parseColor(fileTree?.activeBackground);
  const ftActiveBorder = parseColor(fileTree?.activeBorder);
  const ftSelectedBg = parseColor(fileTree?.selectedBackground);
  const ftHoverBg = parseColor(fileTree?.hoverBackground);
  const panelBg = parseColor(panel?.background);
  const panelBorder = parseColor(panel?.border);
  const editorBg = parseColor(editor?.background);
  const editorFg = parseColor(editor?.foreground);
  const previewBg = parseColor(preview?.background);
  const mutedFg = parseColor(muted?.foreground);
  const borderDefault = parseColor(border?.default);
  const scrollThumb = parseColor(scrollbar?.thumb);
  const scrollThumbHover = parseColor(scrollbar?.thumbHover);
  const chat = parseChatPalette(p.chat);
  const vaultPlayground = parseVaultPlaygroundPalette(p.vaultPlayground);
  const markdownPdfPreview = parseMarkdownPdfPreviewPalette(p.markdownPdfPreview);
  const umlRenderPreview = parseUmlRenderPreviewPalette(p.umlRenderPreview);
  const configScreen = parseConfigScreenPalette(p.configScreen);

  const colors = [
    shellBg,
    shellFg,
    headerBg,
    headerBorder,
    headerFg,
    btnBg,
    btnBorder,
    btnFg,
    btnHoverBg,
    btnActiveBg,
    btnActiveBorder,
    btnActiveFg,
    badgeBg,
    badgeBorder,
    badgeFg,
    popoverBg,
    popoverBorder,
    popoverFg,
    popoverMutedFg,
    popoverHoverBg,
    popoverHeadingFg,
    popoverDividerBorder,
    popoverSelectedFg,
    switchTrackBg,
    switchTrackBorder,
    switchThumbBg,
    switchThumbFg,
    sidebarBg,
    sidebarBorder,
    ftFg,
    ftMuted,
    ftActiveBg,
    ftActiveBorder,
    ftSelectedBg,
    ftHoverBg,
    panelBg,
    panelBorder,
    editorBg,
    editorFg,
    previewBg,
    mutedFg,
    borderDefault,
    scrollThumb,
    scrollThumbHover,
  ];
  if (
    colors.some((c) => c === null) ||
    !chat ||
    !vaultPlayground ||
    !markdownPdfPreview ||
    !umlRenderPreview ||
    !configScreen
  ) {
    return null;
  }

  return {
    fontFamily,
    shell: { background: shellBg!, foreground: shellFg! },
    header: { background: headerBg!, border: headerBorder!, foreground: headerFg! },
    headerButton: {
      background: btnBg!,
      border: btnBorder!,
      foreground: btnFg!,
      hoverBackground: btnHoverBg!,
      activeBackground: btnActiveBg!,
      activeBorder: btnActiveBorder!,
      activeForeground: btnActiveFg!,
    },
    headerBadge: { background: badgeBg!, border: badgeBorder!, foreground: badgeFg! },
    popover: {
      background: popoverBg!,
      border: popoverBorder!,
      foreground: popoverFg!,
      mutedForeground: popoverMutedFg!,
      hoverBackground: popoverHoverBg!,
      headingForeground: popoverHeadingFg!,
      dividerBorder: popoverDividerBorder!,
      selectedForeground: popoverSelectedFg!,
    },
    themeSwitch: {
      trackBackground: switchTrackBg!,
      trackBorder: switchTrackBorder!,
      thumbBackground: switchThumbBg!,
      thumbForeground: switchThumbFg!,
    },
    sidebar: { background: sidebarBg!, border: sidebarBorder! },
    fileTree: {
      foreground: ftFg!,
      mutedForeground: ftMuted!,
      activeBackground: ftActiveBg!,
      activeBorder: ftActiveBorder!,
      selectedBackground: ftSelectedBg!,
      hoverBackground: ftHoverBg!,
    },
    panel: { background: panelBg!, border: panelBorder! },
    editor: { background: editorBg!, foreground: editorFg! },
    preview: { background: previewBg! },
    muted: { foreground: mutedFg! },
    border: { default: borderDefault! },
    scrollbar: { thumb: scrollThumb!, thumbHover: scrollThumbHover! },
    chat,
    vaultPlayground,
    markdownPdfPreview,
    umlRenderPreview,
    configScreen,
  };
}

export type ParseUiThemeResult =
  | { ok: true; theme: UiThemeV1 }
  | { ok: false; errors: string[] };

export function parseUiTheme(raw: unknown): ParseUiThemeResult {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["Theme must be a JSON object."] };
  }
  const value = raw as Record<string, unknown>;
  if (value.version !== 1) {
    errors.push('Theme "version" must be 1.');
  }
  const id = typeof value.id === "string" ? value.id.trim() : "";
  if (!id || !/^[a-z0-9][a-z0-9-_]*$/.test(id)) {
    errors.push('Theme "id" must be a lowercase slug (letters, numbers, hyphens, underscores).');
  }
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) {
    errors.push('Theme "name" is required.');
  }
  const light = parsePalette(value.light);
  if (!light) errors.push('Theme "light" palette is invalid or has invalid hex colors.');
  const dark = parsePalette(value.dark);
  if (!dark) errors.push('Theme "dark" palette is invalid or has invalid hex colors.');

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    theme: {
      version: 1,
      id,
      name,
      description: typeof value.description === "string" ? value.description.trim() : undefined,
      builtIn: value.builtIn === true,
      light: light!,
      dark: dark!,
    },
  };
}

export function mergeUiTheme(current: UiThemeV1, patch: Partial<UiThemeV1>): UiThemeV1 {
  const result = parseUiTheme({
    ...current,
    ...patch,
    light: patch.light ? { ...current.light, ...patch.light } : current.light,
    dark: patch.dark ? { ...current.dark, ...patch.dark } : current.dark,
    version: 1,
  });
  if (result.ok) return result.theme;
  return current;
}

export function duplicateUiTheme(source: UiThemeV1, newId: string, newName: string): UiThemeV1 {
  return {
    version: 1,
    id: newId,
    name: newName,
    description: source.description ? `Based on ${source.name}` : undefined,
    builtIn: false,
    light: structuredClone(source.light),
    dark: structuredClone(source.dark),
  };
}

export function slugifyThemeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "custom-theme";
}
