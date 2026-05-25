type ColorRecord = Record<string, unknown> | undefined;

function colorsFrom(obj: ColorRecord, keys: readonly string[]): string[] | null {
  const out: string[] = [];
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value !== "string" || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim())) {
      return null;
    }
    out.push(value.trim().toLowerCase());
  }
  return out;
}

export type UiMessageBubbleColors = { background: string; foreground: string };
export type UiSystemBubbleColors = { background: string; foreground: string; border: string };
export type UiMarkdownRoleColors = {
  codeInlineBackground: string;
  codeInlineForeground: string;
  codeBlockBackground: string;
  codeBlockForeground: string;
  link: string;
};

export type UiChatPalette = {
  userBubble: UiMessageBubbleColors;
  assistantBubble: UiMessageBubbleColors;
  streamingBubble: UiMessageBubbleColors;
  systemInfo: UiSystemBubbleColors;
  systemWarning: UiSystemBubbleColors;
  systemError: UiSystemBubbleColors;
  thinking: { foreground: string; indicator: string };
  timestamp: { foreground: string };
  markdown: {
    user: UiMarkdownRoleColors;
    assistant: UiMarkdownRoleColors;
    systemInfo: UiMarkdownRoleColors;
    systemWarning: UiMarkdownRoleColors;
    systemError: UiMarkdownRoleColors;
    blockquoteBorder: string;
    tableHeaderBackground: string;
    tableBorder: string;
    hrBorder: string;
  };
  controls: {
    inputBackground: string;
    inputBorder: string;
    inputForeground: string;
    focusRing: string;
    selectBackground: string;
    selectBorder: string;
    selectForeground: string;
    statusForeground: string;
    voicePulse: string;
  };
  chrome: {
    tabInactiveForeground: string;
    tabHoverBackground: string;
    tabsMenuActiveBackground: string;
    tabsMenuActiveForeground: string;
    tabsMenuInactiveForeground: string;
    tabsMenuHoverBackground: string;
    tabIconHoverBackground: string;
    tabRenameInputBackground: string;
    tabRenameInputBorder: string;
  };
};

export type UiVaultPlaygroundPalette = {
  scrim: string;
  background: string;
  border: string;
  foreground: string;
  mutedForeground: string;
  sectionBorder: string;
  userBubble: UiMessageBubbleColors;
  assistantBubble: UiMessageBubbleColors;
  streamingBubble: { background: string; border: string; foreground: string };
  noteLink: { background: string; border: string; foreground: string; hoverBackground: string };
};

function parseBubble(obj: ColorRecord): UiMessageBubbleColors | null {
  const [background, foreground] = colorsFrom(obj, ["background", "foreground"]) ?? [];
  if (!background || !foreground) return null;
  return { background, foreground };
}

function parseSystemBubble(obj: ColorRecord): UiSystemBubbleColors | null {
  const [background, foreground, border] = colorsFrom(obj, ["background", "foreground", "border"]) ?? [];
  if (!background || !foreground || !border) return null;
  return { background, foreground, border };
}

function parseMarkdownRole(obj: ColorRecord): UiMarkdownRoleColors | null {
  const values = colorsFrom(obj, [
    "codeInlineBackground",
    "codeInlineForeground",
    "codeBlockBackground",
    "codeBlockForeground",
    "link",
  ]);
  if (!values || values.length !== 5) return null;
  return {
    codeInlineBackground: values[0]!,
    codeInlineForeground: values[1]!,
    codeBlockBackground: values[2]!,
    codeBlockForeground: values[3]!,
    link: values[4]!,
  };
}

export function parseChatPalette(value: unknown): UiChatPalette | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const chat = value as Record<string, unknown>;
  const markdown = chat.markdown as ColorRecord;

  const userBubble = parseBubble(chat.userBubble as ColorRecord);
  const assistantBubble = parseBubble(chat.assistantBubble as ColorRecord);
  const streamingBubble = parseBubble(chat.streamingBubble as ColorRecord);
  const systemInfo = parseSystemBubble(chat.systemInfo as ColorRecord);
  const systemWarning = parseSystemBubble(chat.systemWarning as ColorRecord);
  const systemError = parseSystemBubble(chat.systemError as ColorRecord);

  const [thinkingFg, thinkingIndicator] = colorsFrom(chat.thinking as ColorRecord, ["foreground", "indicator"]) ?? [];
  const [timestampFg] = colorsFrom(chat.timestamp as ColorRecord, ["foreground"]) ?? [];

  const mdUser = parseMarkdownRole(markdown?.user as ColorRecord);
  const mdAssistant = parseMarkdownRole(markdown?.assistant as ColorRecord);
  const mdInfo = parseMarkdownRole(markdown?.systemInfo as ColorRecord);
  const mdWarning = parseMarkdownRole(markdown?.systemWarning as ColorRecord);
  const mdError = parseMarkdownRole(markdown?.systemError as ColorRecord);
  const [blockquoteBorder, tableHeaderBackground, tableBorder, hrBorder] =
    colorsFrom(markdown, ["blockquoteBorder", "tableHeaderBackground", "tableBorder", "hrBorder"]) ?? [];

  const controls = chat.controls as ColorRecord;
  const [
    inputBackground,
    inputBorder,
    inputForeground,
    focusRing,
    selectBackground,
    selectBorder,
    selectForeground,
    statusForeground,
    voicePulse,
  ] = colorsFrom(controls, [
    "inputBackground",
    "inputBorder",
    "inputForeground",
    "focusRing",
    "selectBackground",
    "selectBorder",
    "selectForeground",
    "statusForeground",
    "voicePulse",
  ]) ?? [];

  const chrome = chat.chrome as ColorRecord;
  const [
    tabInactiveForeground,
    tabHoverBackground,
    tabsMenuActiveBackground,
    tabsMenuActiveForeground,
    tabsMenuInactiveForeground,
    tabsMenuHoverBackground,
    tabIconHoverBackground,
    tabRenameInputBackground,
    tabRenameInputBorder,
  ] = colorsFrom(chrome, [
    "tabInactiveForeground",
    "tabHoverBackground",
    "tabsMenuActiveBackground",
    "tabsMenuActiveForeground",
    "tabsMenuInactiveForeground",
    "tabsMenuHoverBackground",
    "tabIconHoverBackground",
    "tabRenameInputBackground",
    "tabRenameInputBorder",
  ]) ?? [];

  if (
    !userBubble ||
    !assistantBubble ||
    !streamingBubble ||
    !systemInfo ||
    !systemWarning ||
    !systemError ||
    !thinkingFg ||
    !thinkingIndicator ||
    !timestampFg ||
    !mdUser ||
    !mdAssistant ||
    !mdInfo ||
    !mdWarning ||
    !mdError ||
    !blockquoteBorder ||
    !tableHeaderBackground ||
    !tableBorder ||
    !hrBorder ||
    !inputBackground ||
    !inputBorder ||
    !inputForeground ||
    !focusRing ||
    !selectBackground ||
    !selectBorder ||
    !selectForeground ||
    !statusForeground ||
    !voicePulse ||
    !tabInactiveForeground ||
    !tabHoverBackground ||
    !tabsMenuActiveBackground ||
    !tabsMenuActiveForeground ||
    !tabsMenuInactiveForeground ||
    !tabsMenuHoverBackground ||
    !tabIconHoverBackground ||
    !tabRenameInputBackground ||
    !tabRenameInputBorder
  ) {
    return null;
  }

  return {
    userBubble,
    assistantBubble,
    streamingBubble,
    systemInfo,
    systemWarning,
    systemError,
    thinking: { foreground: thinkingFg, indicator: thinkingIndicator },
    timestamp: { foreground: timestampFg },
    markdown: {
      user: mdUser,
      assistant: mdAssistant,
      systemInfo: mdInfo,
      systemWarning: mdWarning,
      systemError: mdError,
      blockquoteBorder,
      tableHeaderBackground,
      tableBorder,
      hrBorder,
    },
    controls: {
      inputBackground,
      inputBorder,
      inputForeground,
      focusRing,
      selectBackground,
      selectBorder,
      selectForeground,
      statusForeground,
      voicePulse,
    },
    chrome: {
      tabInactiveForeground,
      tabHoverBackground,
      tabsMenuActiveBackground,
      tabsMenuActiveForeground,
      tabsMenuInactiveForeground,
      tabsMenuHoverBackground,
      tabIconHoverBackground,
      tabRenameInputBackground,
      tabRenameInputBorder,
    },
  };
}

export type UiMarkdownPdfPreviewPalette = {
  accent: string;
  background: string;
  border: string;
  codeBackground: string;
  codeText: string;
  heading: string;
  inlineCodeBackground: string;
  link: string;
  mutedBackground: string;
  mutedText: string;
  quoteBackground: string;
  quoteBorder: string;
  text: string;
};

export type UiUmlRenderPreviewPalette = {
  background: string;
  border: string;
  headerForeground: string;
  canvasBackground: string;
  canvasBorder: string;
  toolbarForeground: string;
  mutedForeground: string;
  errorForeground: string;
  imageBorder: string;
  resizeHandleBackground: string;
  resizeHandleHoverBackground: string;
};

export type UiConfigScreenPalette = {
  background: string;
  foreground: string;
  mutedForeground: string;
  border: string;
  cardBackground: string;
  cardBorder: string;
  listBackground: string;
  listActiveBackground: string;
  listActiveForeground: string;
  listHoverBackground: string;
  inputBackground: string;
  inputBorder: string;
  inputForeground: string;
  previewBackground: string;
  previewBorder: string;
};

function parsePdfPreview(obj: ColorRecord): UiMarkdownPdfPreviewPalette | null {
  const keys = [
    "accent",
    "background",
    "border",
    "codeBackground",
    "codeText",
    "heading",
    "inlineCodeBackground",
    "link",
    "mutedBackground",
    "mutedText",
    "quoteBackground",
    "quoteBorder",
    "text",
  ] as const;
  const values = colorsFrom(obj, keys);
  if (!values || values.length !== keys.length) return null;
  return {
    accent: values[0]!,
    background: values[1]!,
    border: values[2]!,
    codeBackground: values[3]!,
    codeText: values[4]!,
    heading: values[5]!,
    inlineCodeBackground: values[6]!,
    link: values[7]!,
    mutedBackground: values[8]!,
    mutedText: values[9]!,
    quoteBackground: values[10]!,
    quoteBorder: values[11]!,
    text: values[12]!,
  };
}

function parseUmlPreview(obj: ColorRecord): UiUmlRenderPreviewPalette | null {
  const keys = [
    "background",
    "border",
    "headerForeground",
    "canvasBackground",
    "canvasBorder",
    "toolbarForeground",
    "mutedForeground",
    "errorForeground",
    "imageBorder",
    "resizeHandleBackground",
    "resizeHandleHoverBackground",
  ] as const;
  const values = colorsFrom(obj, keys);
  if (!values || values.length !== keys.length) return null;
  return {
    background: values[0]!,
    border: values[1]!,
    headerForeground: values[2]!,
    canvasBackground: values[3]!,
    canvasBorder: values[4]!,
    toolbarForeground: values[5]!,
    mutedForeground: values[6]!,
    errorForeground: values[7]!,
    imageBorder: values[8]!,
    resizeHandleBackground: values[9]!,
    resizeHandleHoverBackground: values[10]!,
  };
}

function parseConfigScreen(obj: ColorRecord): UiConfigScreenPalette | null {
  const keys = [
    "background",
    "foreground",
    "mutedForeground",
    "border",
    "cardBackground",
    "cardBorder",
    "listBackground",
    "listActiveBackground",
    "listActiveForeground",
    "listHoverBackground",
    "inputBackground",
    "inputBorder",
    "inputForeground",
    "previewBackground",
    "previewBorder",
  ] as const;
  const values = colorsFrom(obj, keys);
  if (!values || values.length !== keys.length) return null;
  return {
    background: values[0]!,
    foreground: values[1]!,
    mutedForeground: values[2]!,
    border: values[3]!,
    cardBackground: values[4]!,
    cardBorder: values[5]!,
    listBackground: values[6]!,
    listActiveBackground: values[7]!,
    listActiveForeground: values[8]!,
    listHoverBackground: values[9]!,
    inputBackground: values[10]!,
    inputBorder: values[11]!,
    inputForeground: values[12]!,
    previewBackground: values[13]!,
    previewBorder: values[14]!,
  };
}

export function parseMarkdownPdfPreviewPalette(value: unknown): UiMarkdownPdfPreviewPalette | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return parsePdfPreview(value as ColorRecord);
}

export function parseUmlRenderPreviewPalette(value: unknown): UiUmlRenderPreviewPalette | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return parseUmlPreview(value as ColorRecord);
}

export function parseConfigScreenPalette(value: unknown): UiConfigScreenPalette | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return parseConfigScreen(value as ColorRecord);
}

export function parseVaultPlaygroundPalette(value: unknown): UiVaultPlaygroundPalette | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const vault = value as Record<string, unknown>;

  const [scrim, background, border, foreground, mutedForeground, sectionBorder] = colorsFrom(vault, [
    "scrim",
    "background",
    "border",
    "foreground",
    "mutedForeground",
    "sectionBorder",
  ]) ?? [];

  const userBubble = parseBubble(vault.userBubble as ColorRecord);
  const assistantBubble = parseBubble(vault.assistantBubble as ColorRecord);

  const [streamBg, streamBorder, streamFg] =
    colorsFrom(vault.streamingBubble as ColorRecord, ["background", "border", "foreground"]) ?? [];
  const [noteBg, noteBorder, noteFg, noteHover] =
    colorsFrom(vault.noteLink as ColorRecord, ["background", "border", "foreground", "hoverBackground"]) ?? [];

  if (
    !scrim ||
    !background ||
    !border ||
    !foreground ||
    !mutedForeground ||
    !sectionBorder ||
    !userBubble ||
    !assistantBubble ||
    !streamBg ||
    !streamBorder ||
    !streamFg ||
    !noteBg ||
    !noteBorder ||
    !noteFg ||
    !noteHover
  ) {
    return null;
  }

  return {
    scrim,
    background,
    border,
    foreground,
    mutedForeground,
    sectionBorder,
    userBubble,
    assistantBubble,
    streamingBubble: { background: streamBg, border: streamBorder, foreground: streamFg },
    noteLink: {
      background: noteBg,
      border: noteBorder,
      foreground: noteFg,
      hoverBackground: noteHover,
    },
  };
}
