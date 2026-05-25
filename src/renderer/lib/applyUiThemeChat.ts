import type { UiChatPalette, UiVaultPlaygroundPalette } from "./uiThemeParseSections";
import type { UiThemePalette } from "../types/uiTheme";

function setVars(root: HTMLElement, entries: Array<[string, string]>): void {
  for (const [name, value] of entries) {
    root.style.setProperty(name, value);
  }
}

function bubbleVars(prefix: string, bubble: { background: string; foreground: string }): Array<[string, string]> {
  return [
    [`${prefix}-bg`, bubble.background],
    [`${prefix}-fg`, bubble.foreground],
  ];
}

function systemVars(prefix: string, bubble: { background: string; foreground: string; border: string }): Array<[string, string]> {
  return [
    [`${prefix}-bg`, bubble.background],
    [`${prefix}-fg`, bubble.foreground],
    [`${prefix}-border`, bubble.border],
  ];
}

function markdownRoleVars(role: string, md: {
  codeInlineBackground: string;
  codeInlineForeground: string;
  codeBlockBackground: string;
  codeBlockForeground: string;
  link: string;
}): Array<[string, string]> {
  const p = `--ui-chat-md-${role}`;
  return [
    [`${p}-code-inline-bg`, md.codeInlineBackground],
    [`${p}-code-inline-fg`, md.codeInlineForeground],
    [`${p}-code-block-bg`, md.codeBlockBackground],
    [`${p}-code-block-fg`, md.codeBlockForeground],
    [`${p}-link`, md.link],
  ];
}

function applyToolsAndConfigVars(palette: UiThemePalette): Array<[string, string]> {
  const pdf = palette.markdownPdfPreview;
  const uml = palette.umlRenderPreview;
  const cfg = palette.configScreen;
  return [
    ["--ui-md-pdf-accent", pdf.accent],
    ["--ui-md-pdf-bg", pdf.background],
    ["--ui-md-pdf-border", pdf.border],
    ["--ui-md-pdf-code-bg", pdf.codeBackground],
    ["--ui-md-pdf-code-fg", pdf.codeText],
    ["--ui-md-pdf-heading", pdf.heading],
    ["--ui-md-pdf-inline-code-bg", pdf.inlineCodeBackground],
    ["--ui-md-pdf-link", pdf.link],
    ["--ui-md-pdf-muted-bg", pdf.mutedBackground],
    ["--ui-md-pdf-muted-fg", pdf.mutedText],
    ["--ui-md-pdf-quote-bg", pdf.quoteBackground],
    ["--ui-md-pdf-quote-border", pdf.quoteBorder],
    ["--ui-md-pdf-text", pdf.text],
    ["--ui-uml-preview-bg", uml.background],
    ["--ui-uml-preview-border", uml.border],
    ["--ui-uml-preview-header-fg", uml.headerForeground],
    ["--ui-uml-preview-canvas-bg", uml.canvasBackground],
    ["--ui-uml-preview-canvas-border", uml.canvasBorder],
    ["--ui-uml-preview-toolbar-fg", uml.toolbarForeground],
    ["--ui-uml-preview-muted-fg", uml.mutedForeground],
    ["--ui-uml-preview-error-fg", uml.errorForeground],
    ["--ui-uml-preview-image-border", uml.imageBorder],
    ["--ui-uml-preview-resize-handle", uml.resizeHandleBackground],
    ["--ui-uml-preview-resize-handle-hover", uml.resizeHandleHoverBackground],
    ["--ui-config-bg", cfg.background],
    ["--ui-config-fg", cfg.foreground],
    ["--ui-config-muted-fg", cfg.mutedForeground],
    ["--ui-config-border", cfg.border],
    ["--ui-config-card-bg", cfg.cardBackground],
    ["--ui-config-card-border", cfg.cardBorder],
    ["--ui-config-list-bg", cfg.listBackground],
    ["--ui-config-list-active-bg", cfg.listActiveBackground],
    ["--ui-config-list-active-fg", cfg.listActiveForeground],
    ["--ui-config-list-hover-bg", cfg.listHoverBackground],
    ["--ui-config-input-bg", cfg.inputBackground],
    ["--ui-config-input-border", cfg.inputBorder],
    ["--ui-config-input-fg", cfg.inputForeground],
    ["--ui-config-preview-bg", cfg.previewBackground],
    ["--ui-config-preview-border", cfg.previewBorder],
  ];
}

export function applyChatAndVaultThemeVars(palette: UiThemePalette): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const { chat, vaultPlayground: vault } = palette;

  setVars(root, [
    ...bubbleVars("--ui-chat-user", chat.userBubble),
    ...bubbleVars("--ui-chat-assistant", chat.assistantBubble),
    ...bubbleVars("--ui-chat-streaming", chat.streamingBubble),
    ...systemVars("--ui-chat-system-info", chat.systemInfo),
    ...systemVars("--ui-chat-system-warning", chat.systemWarning),
    ...systemVars("--ui-chat-system-error", chat.systemError),
    ["--ui-chat-thinking-fg", chat.thinking.foreground],
    ["--ui-chat-thinking-indicator", chat.thinking.indicator],
    ["--ui-chat-timestamp-fg", chat.timestamp.foreground],
    ...markdownRoleVars("user", chat.markdown.user),
    ...markdownRoleVars("assistant", chat.markdown.assistant),
    ...markdownRoleVars("system-info", chat.markdown.systemInfo),
    ...markdownRoleVars("system-warning", chat.markdown.systemWarning),
    ...markdownRoleVars("system-error", chat.markdown.systemError),
    ["--ui-chat-md-blockquote-border", chat.markdown.blockquoteBorder],
    ["--ui-chat-md-table-header-bg", chat.markdown.tableHeaderBackground],
    ["--ui-chat-md-table-border", chat.markdown.tableBorder],
    ["--ui-chat-md-hr-border", chat.markdown.hrBorder],
    ["--ui-chat-control-input-bg", chat.controls.inputBackground],
    ["--ui-chat-control-input-border", chat.controls.inputBorder],
    ["--ui-chat-control-input-fg", chat.controls.inputForeground],
    ["--ui-chat-control-focus-ring", chat.controls.focusRing],
    ["--ui-chat-control-select-bg", chat.controls.selectBackground],
    ["--ui-chat-control-select-border", chat.controls.selectBorder],
    ["--ui-chat-control-select-fg", chat.controls.selectForeground],
    ["--ui-chat-control-status-fg", chat.controls.statusForeground],
    ["--ui-chat-control-voice-pulse", chat.controls.voicePulse],
    ["--ui-chat-tab-inactive-fg", chat.chrome.tabInactiveForeground],
    ["--ui-chat-tab-hover-bg", chat.chrome.tabHoverBackground],
    ["--ui-chat-tabs-menu-active-bg", chat.chrome.tabsMenuActiveBackground],
    ["--ui-chat-tabs-menu-active-fg", chat.chrome.tabsMenuActiveForeground],
    ["--ui-chat-tabs-menu-inactive-fg", chat.chrome.tabsMenuInactiveForeground],
    ["--ui-chat-tabs-menu-hover-bg", chat.chrome.tabsMenuHoverBackground],
    ["--ui-chat-tab-icon-hover-bg", chat.chrome.tabIconHoverBackground],
    ["--ui-chat-tab-rename-input-bg", chat.chrome.tabRenameInputBackground],
    ["--ui-chat-tab-rename-input-border", chat.chrome.tabRenameInputBorder],
    ...applyVaultVars(vault),
    ...applyToolsAndConfigVars(palette),
  ]);
}

function applyVaultVars(vault: UiVaultPlaygroundPalette): Array<[string, string]> {
  return [
    ["--ui-vault-scrim", vault.scrim],
    ["--ui-vault-bg", vault.background],
    ["--ui-vault-border", vault.border],
    ["--ui-vault-fg", vault.foreground],
    ["--ui-vault-muted-fg", vault.mutedForeground],
    ["--ui-vault-section-border", vault.sectionBorder],
    ...bubbleVars("--ui-vault-user", vault.userBubble),
    ...bubbleVars("--ui-vault-assistant", vault.assistantBubble),
    ["--ui-vault-stream-bg", vault.streamingBubble.background],
    ["--ui-vault-stream-border", vault.streamingBubble.border],
    ["--ui-vault-stream-fg", vault.streamingBubble.foreground],
    ["--ui-vault-note-bg", vault.noteLink.background],
    ["--ui-vault-note-border", vault.noteLink.border],
    ["--ui-vault-note-fg", vault.noteLink.foreground],
    ["--ui-vault-note-hover-bg", vault.noteLink.hoverBackground],
  ];
}
