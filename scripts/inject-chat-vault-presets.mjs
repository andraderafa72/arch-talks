import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/renderer/themes/presets");

const fileTreeSidebarLight = {
  sidebar: { background: "#ececee", border: "#d4d4d8" },
  fileTree: {
    foreground: "#18181b",
    mutedForeground: "#52525b",
    activeBackground: "#d4d4d8",
    activeBorder: "#a1a1aa",
    selectedBackground: "#d4d4d8",
    hoverBackground: "#e4e4e7",
  },
};

const fileTreeSidebarDark = {
  sidebar: { background: "#050508", border: "#3f3f46" },
  fileTree: {
    foreground: "#f4f4f5",
    mutedForeground: "#a1a1aa",
    activeBackground: "#3f3f46",
    activeBorder: "#71717a",
    selectedBackground: "#3f3f46",
    hoverBackground: "#27272a",
  },
};

const markdownPdfPreviewLight = {
  accent: "#2563eb",
  background: "#fefefe",
  border: "#cecece",
  codeBackground: "#18181b",
  codeText: "#f4f4f5",
  heading: "#0f172a",
  inlineCodeBackground: "#e4e4e7",
  link: "#1d4ed8",
  mutedBackground: "#f4f4f5",
  mutedText: "#52525b",
  quoteBorder: "#a1a1aa",
  quoteBackground: "#f8fafc",
  text: "#18181b",
};

const markdownPdfPreviewDark = {
  accent: "#60a5fa",
  background: "#09090b",
  border: "#3f3f46",
  codeBackground: "#18181b",
  codeText: "#f4f4f5",
  heading: "#fafafa",
  inlineCodeBackground: "#3f3f46",
  link: "#93c5fd",
  mutedBackground: "#27272a",
  mutedText: "#d4d4d8",
  quoteBorder: "#71717a",
  quoteBackground: "#27272a",
  text: "#f4f4f5",
};

const umlRenderPreviewLight = {
  background: "#fefefe",
  border: "#e4e4e7",
  headerForeground: "#18181b",
  canvasBackground: "#fafafa",
  canvasBorder: "#e4e4e7",
  toolbarForeground: "#52525b",
  mutedForeground: "#71717a",
  errorForeground: "#dc2626",
  imageBorder: "#d4d4d8",
  resizeHandleBackground: "#e4e4e7",
  resizeHandleHoverBackground: "#d4d4d8",
};

const umlRenderPreviewDark = {
  background: "#09090b",
  border: "#3f3f46",
  headerForeground: "#f4f4f5",
  canvasBackground: "#18181b",
  canvasBorder: "#3f3f46",
  toolbarForeground: "#a1a1aa",
  mutedForeground: "#71717a",
  errorForeground: "#f87171",
  imageBorder: "#52525b",
  resizeHandleBackground: "#3f3f46",
  resizeHandleHoverBackground: "#52525b",
};

const configScreenLight = {
  background: "#fefefe",
  foreground: "#18181b",
  mutedForeground: "#71717a",
  border: "#e4e4e7",
  cardBackground: "#fefefe",
  cardBorder: "#e4e4e7",
  listBackground: "#fefefe",
  listActiveBackground: "#f4f4f5",
  listActiveForeground: "#18181b",
  listHoverBackground: "#fafafa",
  inputBackground: "#fefefe",
  inputBorder: "#e4e4e7",
  inputForeground: "#18181b",
  previewBackground: "#ffffff",
  previewBorder: "#e4e4e7",
};

const configScreenDark = {
  background: "#09090b",
  foreground: "#f4f4f5",
  mutedForeground: "#a1a1aa",
  border: "#3f3f46",
  cardBackground: "#18181b",
  cardBorder: "#3f3f46",
  listBackground: "#09090b",
  listActiveBackground: "#27272a",
  listActiveForeground: "#f4f4f5",
  listHoverBackground: "#18181b",
  inputBackground: "#18181b",
  inputBorder: "#3f3f46",
  inputForeground: "#f4f4f5",
  previewBackground: "#18181b",
  previewBorder: "#3f3f46",
};

const chatVaultLight = {
  ...fileTreeSidebarLight,
  chat: {
    userBubble: { background: "#18181b", foreground: "#ffffff" },
    assistantBubble: { background: "#f4f4f5", foreground: "#18181b" },
    streamingBubble: { background: "#f4f4f5", foreground: "#18181b" },
    systemInfo: { background: "#f8fafc", foreground: "#334155", border: "#e2e8f0" },
    systemWarning: { background: "#fffbeb", foreground: "#78350f", border: "#fcd34d" },
    systemError: { background: "#fef2f2", foreground: "#991b1b", border: "#fca5a5" },
    thinking: { foreground: "#71717a", indicator: "#a1a1aa" },
    timestamp: { foreground: "#71717a" },
    markdown: {
      user: {
        codeInlineBackground: "#3f3f46",
        codeInlineForeground: "#f4f4f5",
        codeBlockBackground: "#27272a",
        codeBlockForeground: "#fafafa",
        link: "#7dd3fc",
      },
      assistant: {
        codeInlineBackground: "#d4d4d8",
        codeInlineForeground: "#18181b",
        codeBlockBackground: "#0f172a",
        codeBlockForeground: "#f8fafc",
        link: "#1d4ed8",
      },
      systemInfo: {
        codeInlineBackground: "#e2e8f0",
        codeInlineForeground: "#334155",
        codeBlockBackground: "#1e293b",
        codeBlockForeground: "#e2e8f0",
        link: "#334155",
      },
      systemWarning: {
        codeInlineBackground: "#fde68a",
        codeInlineForeground: "#78350f",
        codeBlockBackground: "#451a03",
        codeBlockForeground: "#fde68a",
        link: "#92400e",
      },
      systemError: {
        codeInlineBackground: "#fecaca",
        codeInlineForeground: "#991b1b",
        codeBlockBackground: "#450a0a",
        codeBlockForeground: "#fecaca",
        link: "#b91c1c",
      },
      blockquoteBorder: "#a1a1aa",
      tableHeaderBackground: "#e4e4e7",
      tableBorder: "#d4d4d8",
      hrBorder: "#d4d4d8",
    },
    controls: {
      inputBackground: "#fefefe",
      inputBorder: "#e4e4e7",
      inputForeground: "#18181b",
      focusRing: "#a1a1aa",
      selectBackground: "#ffffff",
      selectBorder: "#e4e4e7",
      selectForeground: "#3f3f46",
      statusForeground: "#52525b",
      voicePulse: "#ef4444",
    },
    chrome: {
      tabInactiveForeground: "#3f3f46",
      tabHoverBackground: "#e4e4e7",
      tabsMenuActiveBackground: "#f4f4f5",
      tabsMenuActiveForeground: "#18181b",
      tabsMenuInactiveForeground: "#71717a",
      tabsMenuHoverBackground: "#f4f4f5",
      tabIconHoverBackground: "#e4e4e7",
      tabRenameInputBackground: "#ffffff",
      tabRenameInputBorder: "#d4d4d8",
    },
  },
  vaultPlayground: {
    scrim: "#00000033",
    background: "#fefefe",
    border: "#e4e4e7",
    foreground: "#18181b",
    mutedForeground: "#71717a",
    sectionBorder: "#e4e4e7",
    userBubble: { background: "#18181b", foreground: "#ffffff" },
    assistantBubble: { background: "#f4f4f5", foreground: "#18181b" },
    streamingBubble: { background: "#fafafa", border: "#d4d4d8", foreground: "#18181b" },
    noteLink: {
      background: "#ffffff",
      border: "#e4e4e7",
      foreground: "#3f3f46",
      hoverBackground: "#f4f4f5",
    },
  },
  markdownPdfPreview: markdownPdfPreviewLight,
  umlRenderPreview: umlRenderPreviewLight,
  configScreen: configScreenLight,
};

const chatVaultDark = {
  ...fileTreeSidebarDark,
  chat: {
    userBubble: { background: "#3f3f46", foreground: "#fafafa" },
    assistantBubble: { background: "#27272a", foreground: "#f4f4f5" },
    streamingBubble: { background: "#27272a", foreground: "#f4f4f5" },
    systemInfo: { background: "#0f172a80", foreground: "#e2e8f0", border: "#475569" },
    systemWarning: { background: "#451a0380", foreground: "#fde68a", border: "#b45309" },
    systemError: { background: "#450a0a80", foreground: "#fecaca", border: "#b91c1c" },
    thinking: { foreground: "#a1a1aa", indicator: "#71717a" },
    timestamp: { foreground: "#a1a1aa" },
    markdown: {
      user: {
        codeInlineBackground: "#52525b",
        codeInlineForeground: "#f4f4f5",
        codeBlockBackground: "#18181b",
        codeBlockForeground: "#fafafa",
        link: "#7dd3fc",
      },
      assistant: {
        codeInlineBackground: "#3f3f46",
        codeInlineForeground: "#f4f4f5",
        codeBlockBackground: "#0f172a",
        codeBlockForeground: "#f8fafc",
        link: "#93c5fd",
      },
      systemInfo: {
        codeInlineBackground: "#334155",
        codeInlineForeground: "#e2e8f0",
        codeBlockBackground: "#020617",
        codeBlockForeground: "#e2e8f0",
        link: "#cbd5e1",
      },
      systemWarning: {
        codeInlineBackground: "#78350f",
        codeInlineForeground: "#fde68a",
        codeBlockBackground: "#292524",
        codeBlockForeground: "#fde68a",
        link: "#fcd34d",
      },
      systemError: {
        codeInlineBackground: "#7f1d1d",
        codeInlineForeground: "#fecaca",
        codeBlockBackground: "#450a0a",
        codeBlockForeground: "#fecaca",
        link: "#fca5a5",
      },
      blockquoteBorder: "#71717a",
      tableHeaderBackground: "#3f3f46",
      tableBorder: "#52525b",
      hrBorder: "#52525b",
    },
    controls: {
      inputBackground: "#18181b",
      inputBorder: "#3f3f46",
      inputForeground: "#f4f4f5",
      focusRing: "#71717a",
      selectBackground: "#27272a",
      selectBorder: "#52525b",
      selectForeground: "#e4e4e7",
      statusForeground: "#a1a1aa",
      voicePulse: "#ef4444",
    },
    chrome: {
      tabInactiveForeground: "#d4d4d8",
      tabHoverBackground: "#3f3f46",
      tabsMenuActiveBackground: "#27272a",
      tabsMenuActiveForeground: "#f4f4f5",
      tabsMenuInactiveForeground: "#a1a1aa",
      tabsMenuHoverBackground: "#27272a",
      tabIconHoverBackground: "#3f3f46",
      tabRenameInputBackground: "#18181b",
      tabRenameInputBorder: "#52525b",
    },
  },
  vaultPlayground: {
    scrim: "#00000066",
    background: "#09090b",
    border: "#3f3f46",
    foreground: "#f4f4f5",
    mutedForeground: "#a1a1aa",
    sectionBorder: "#3f3f46",
    userBubble: { background: "#3f3f46", foreground: "#fafafa" },
    assistantBubble: { background: "#27272a", foreground: "#f4f4f5" },
    streamingBubble: { background: "#27272a80", border: "#52525b", foreground: "#f4f4f5" },
    noteLink: {
      background: "#18181b",
      border: "#52525b",
      foreground: "#e4e4e7",
      hoverBackground: "#27272a",
    },
  },
  markdownPdfPreview: markdownPdfPreviewDark,
  umlRenderPreview: umlRenderPreviewDark,
  configScreen: configScreenDark,
};

const solarizedLight = structuredClone(chatVaultLight);
solarizedLight.sidebar = { background: "#eee8d5", border: "#93a1a1" };
solarizedLight.fileTree = {
  foreground: "#073642",
  mutedForeground: "#657b83",
  activeBackground: "#d6d2c4",
  activeBorder: "#93a1a1",
  selectedBackground: "#d6d2c4",
  hoverBackground: "#e8e4d9",
};
solarizedLight.chat.userBubble = { background: "#586e75", foreground: "#fdf6e3" };
solarizedLight.chat.assistantBubble = { background: "#eee8d5", foreground: "#657b83" };
solarizedLight.chat.streamingBubble = { background: "#eee8d5", foreground: "#657b83" };
solarizedLight.chat.markdown.assistant.codeBlockBackground = "#073642";
solarizedLight.chat.markdown.assistant.codeBlockForeground = "#fdf6e3";
solarizedLight.vaultPlayground.background = "#fdf6e3";
solarizedLight.vaultPlayground.userBubble = { background: "#586e75", foreground: "#fdf6e3" };
solarizedLight.vaultPlayground.assistantBubble = { background: "#eee8d5", foreground: "#657b83" };
solarizedLight.markdownPdfPreview = {
  ...markdownPdfPreviewLight,
  accent: "#268bd2",
  background: "#fdf6e3",
  border: "#93a1a1",
  codeBackground: "#073642",
  codeText: "#fdf6e3",
  heading: "#073642",
  inlineCodeBackground: "#eee8d5",
  link: "#268bd2",
  mutedBackground: "#eee8d5",
  mutedText: "#657b83",
  quoteBorder: "#93a1a1",
  quoteBackground: "#eee8d5",
  text: "#657b83",
};
solarizedLight.configScreen = {
  ...configScreenLight,
  background: "#fdf6e3",
  cardBackground: "#fdf6e3",
  listActiveBackground: "#eee8d5",
  inputBackground: "#fdf6e3",
  previewBackground: "#fdf6e3",
};
solarizedLight.umlRenderPreview = {
  ...umlRenderPreviewLight,
  background: "#fdf6e3",
  canvasBackground: "#eee8d5",
  border: "#93a1a1",
  canvasBorder: "#93a1a1",
};

const solarizedDark = structuredClone(chatVaultDark);
solarizedDark.sidebar = { background: "#00252b", border: "#586e75" };
solarizedDark.fileTree = {
  foreground: "#93a1a1",
  mutedForeground: "#657b83",
  activeBackground: "#073642",
  activeBorder: "#586e75",
  selectedBackground: "#073642",
  hoverBackground: "#073642",
};
solarizedDark.chat.userBubble = { background: "#657b83", foreground: "#fdf6e3" };
solarizedDark.chat.assistantBubble = { background: "#073642", foreground: "#93a1a1" };
solarizedDark.chat.streamingBubble = { background: "#073642", foreground: "#93a1a1" };
solarizedDark.chat.markdown.assistant.codeBlockBackground = "#002b36";
solarizedDark.chat.markdown.assistant.codeBlockForeground = "#fdf6e3";
solarizedDark.vaultPlayground.background = "#002b36";
solarizedDark.vaultPlayground.userBubble = { background: "#657b83", foreground: "#fdf6e3" };
solarizedDark.vaultPlayground.assistantBubble = { background: "#073642", foreground: "#93a1a1" };
solarizedDark.markdownPdfPreview = {
  ...markdownPdfPreviewDark,
  accent: "#2aa198",
  background: "#002b36",
  border: "#586e75",
  codeBackground: "#073642",
  codeText: "#fdf6e3",
  heading: "#fdf6e3",
  inlineCodeBackground: "#073642",
  link: "#2aa198",
  mutedBackground: "#073642",
  mutedText: "#93a1a1",
  quoteBorder: "#586e75",
  quoteBackground: "#073642",
  text: "#93a1a1",
};
solarizedDark.configScreen = {
  ...configScreenDark,
  background: "#002b36",
  cardBackground: "#073642",
  listActiveBackground: "#073642",
  inputBackground: "#073642",
  previewBackground: "#073642",
};
solarizedDark.umlRenderPreview = {
  ...umlRenderPreviewDark,
  background: "#002b36",
  canvasBackground: "#073642",
  border: "#586e75",
  canvasBorder: "#586e75",
};

const nordLight = structuredClone(chatVaultLight);
nordLight.sidebar = { background: "#d8dee9", border: "#c0c8d4" };
nordLight.fileTree = {
  foreground: "#2e3440",
  mutedForeground: "#4c566a",
  activeBackground: "#c8d0e0",
  activeBorder: "#81a1c1",
  selectedBackground: "#c8d0e0",
  hoverBackground: "#d0d6e2",
};
nordLight.chat.userBubble = { background: "#2e3440", foreground: "#eceff4" };
nordLight.chat.assistantBubble = { background: "#e5e9f0", foreground: "#2e3440" };
nordLight.chat.streamingBubble = { background: "#e5e9f0", foreground: "#2e3440" };
nordLight.chat.markdown.assistant.codeBlockBackground = "#3b4252";
nordLight.chat.markdown.assistant.codeBlockForeground = "#eceff4";
nordLight.vaultPlayground.background = "#eceff4";
nordLight.vaultPlayground.userBubble = { background: "#2e3440", foreground: "#eceff4" };
nordLight.vaultPlayground.assistantBubble = { background: "#e5e9f0", foreground: "#2e3440" };
nordLight.markdownPdfPreview = {
  ...markdownPdfPreviewLight,
  accent: "#5e81ac",
  background: "#eceff4",
  border: "#d8dee9",
  codeBackground: "#3b4252",
  codeText: "#eceff4",
  heading: "#2e3440",
  inlineCodeBackground: "#e5e9f0",
  link: "#5e81ac",
  mutedBackground: "#e5e9f0",
  mutedText: "#4c566a",
  quoteBorder: "#d8dee9",
  quoteBackground: "#e5e9f0",
  text: "#2e3440",
};
nordLight.configScreen = {
  ...configScreenLight,
  background: "#eceff4",
  cardBackground: "#eceff4",
  listActiveBackground: "#e5e9f0",
  inputBackground: "#eceff4",
  previewBackground: "#eceff4",
};
nordLight.umlRenderPreview = {
  ...umlRenderPreviewLight,
  background: "#eceff4",
  canvasBackground: "#e5e9f0",
  border: "#d8dee9",
  canvasBorder: "#d8dee9",
};

const nordDark = structuredClone(chatVaultDark);
nordDark.sidebar = { background: "#242933", border: "#4c566a" };
nordDark.fileTree = {
  foreground: "#d8dee9",
  mutedForeground: "#81a1c1",
  activeBackground: "#3b4252",
  activeBorder: "#5e81ac",
  selectedBackground: "#3b4252",
  hoverBackground: "#3b4252",
};
nordDark.chat.userBubble = { background: "#4c566a", foreground: "#eceff4" };
nordDark.chat.assistantBubble = { background: "#3b4252", foreground: "#d8dee9" };
nordDark.chat.streamingBubble = { background: "#3b4252", foreground: "#d8dee9" };
nordDark.chat.markdown.assistant.codeBlockBackground = "#242933";
nordDark.chat.markdown.assistant.codeBlockForeground = "#eceff4";
nordDark.vaultPlayground.background = "#2e3440";
nordDark.vaultPlayground.userBubble = { background: "#4c566a", foreground: "#eceff4" };
nordDark.vaultPlayground.assistantBubble = { background: "#3b4252", foreground: "#d8dee9" };
nordDark.markdownPdfPreview = {
  ...markdownPdfPreviewDark,
  accent: "#88c0d0",
  background: "#2e3440",
  border: "#4c566a",
  codeBackground: "#3b4252",
  codeText: "#eceff4",
  heading: "#eceff4",
  inlineCodeBackground: "#3b4252",
  link: "#88c0d0",
  mutedBackground: "#3b4252",
  mutedText: "#d8dee9",
  quoteBorder: "#4c566a",
  quoteBackground: "#3b4252",
  text: "#d8dee9",
};
nordDark.configScreen = {
  ...configScreenDark,
  background: "#2e3440",
  cardBackground: "#3b4252",
  listActiveBackground: "#3b4252",
  inputBackground: "#3b4252",
  previewBackground: "#3b4252",
};
nordDark.umlRenderPreview = {
  ...umlRenderPreviewDark,
  background: "#2e3440",
  canvasBackground: "#3b4252",
  border: "#4c566a",
  canvasBorder: "#4c566a",
};

const orangeLight = structuredClone(chatVaultLight);
orangeLight.sidebar = { background: "#b8a090", border: "#a09078" };
orangeLight.fileTree = {
  foreground: "#3d3028",
  mutedForeground: "#6b5c50",
  activeBackground: "#a89888",
  activeBorder: "#8a7868",
  selectedBackground: "#a89888",
  hoverBackground: "#b0a090",
};
orangeLight.chat.userBubble = { background: "#9a5c28", foreground: "#fff8f0" };
orangeLight.chat.assistantBubble = { background: "#ffe8d0", foreground: "#3d2e24" };
orangeLight.chat.streamingBubble = { background: "#ffe8d0", foreground: "#3d2e24" };
orangeLight.chat.markdown.user.link = "#c2410c";
orangeLight.chat.markdown.assistant.link = "#c2410c";
orangeLight.chat.markdown.assistant.codeBlockBackground = "#3d3028";
orangeLight.chat.markdown.assistant.codeBlockForeground = "#fff4eb";
orangeLight.vaultPlayground.background = "#fff4eb";
orangeLight.vaultPlayground.userBubble = { background: "#9a5c28", foreground: "#fff8f0" };
orangeLight.vaultPlayground.assistantBubble = { background: "#ffe8d0", foreground: "#3d2e24" };
orangeLight.markdownPdfPreview = {
  ...markdownPdfPreviewLight,
  accent: "#ea580c",
  background: "#fff4eb",
  border: "#e0cfc0",
  codeBackground: "#3d3028",
  codeText: "#fff4eb",
  heading: "#3d2e24",
  inlineCodeBackground: "#ffe8d0",
  link: "#c2410c",
  mutedBackground: "#ffe8d0",
  mutedText: "#7a6a5c",
  quoteBorder: "#d4b8a0",
  quoteBackground: "#ffecd8",
  text: "#3d2e24",
};
orangeLight.configScreen = {
  ...configScreenLight,
  background: "#fff4eb",
  foreground: "#3d2e24",
  mutedForeground: "#7a6a5c",
  border: "#e0cfc0",
  cardBackground: "#fffcf8",
  cardBorder: "#e0cfc0",
  listActiveBackground: "#ffe8d0",
  listActiveForeground: "#3d2e24",
  listHoverBackground: "#ffecd8",
  inputBackground: "#fffcf8",
  inputBorder: "#e0cfc0",
  inputForeground: "#3d2e24",
  previewBackground: "#fffcf8",
  previewBorder: "#e0cfc0",
};
orangeLight.umlRenderPreview = {
  ...umlRenderPreviewLight,
  background: "#fff4eb",
  canvasBackground: "#ffecd8",
  border: "#e0cfc0",
  canvasBorder: "#d4b8a0",
  headerForeground: "#3d2e24",
  toolbarForeground: "#7a6a5c",
  resizeHandleBackground: "#e0cfc0",
  resizeHandleHoverBackground: "#d4b8a0",
};

const orangeDark = structuredClone(chatVaultDark);
orangeDark.sidebar = { background: "#1e1612", border: "#4a3828" };
orangeDark.fileTree = {
  foreground: "#f0e0d0",
  mutedForeground: "#b8a090",
  activeBackground: "#352820",
  activeBorder: "#6a5040",
  selectedBackground: "#352820",
  hoverBackground: "#2a2018",
};
orangeDark.chat.userBubble = { background: "#b45309", foreground: "#fff8f0" };
orangeDark.chat.assistantBubble = { background: "#352820", foreground: "#f5e8dc" };
orangeDark.chat.streamingBubble = { background: "#352820", foreground: "#f5e8dc" };
orangeDark.chat.markdown.user.link = "#fdba74";
orangeDark.chat.markdown.assistant.link = "#fdba74";
orangeDark.chat.markdown.assistant.codeBlockBackground = "#1a120e";
orangeDark.chat.markdown.assistant.codeBlockForeground = "#fff4eb";
orangeDark.vaultPlayground.background = "#1a120e";
orangeDark.vaultPlayground.userBubble = { background: "#b45309", foreground: "#fff8f0" };
orangeDark.vaultPlayground.assistantBubble = { background: "#352820", foreground: "#f5e8dc" };
orangeDark.markdownPdfPreview = {
  ...markdownPdfPreviewDark,
  accent: "#fb923c",
  background: "#1a120e",
  border: "#4a3828",
  codeBackground: "#2a2018",
  codeText: "#f5e8dc",
  heading: "#f5e8dc",
  inlineCodeBackground: "#352820",
  link: "#fdba74",
  mutedBackground: "#352820",
  mutedText: "#b8a090",
  quoteBorder: "#5c4838",
  quoteBackground: "#2a2018",
  text: "#f5e8dc",
};
orangeDark.configScreen = {
  ...configScreenDark,
  background: "#1a120e",
  foreground: "#f5e8dc",
  mutedForeground: "#b8a090",
  border: "#4a3828",
  cardBackground: "#2a2018",
  cardBorder: "#4a3828",
  listActiveBackground: "#352820",
  listActiveForeground: "#f5e8dc",
  listHoverBackground: "#2a2018",
  inputBackground: "#2a2018",
  inputBorder: "#4a3828",
  inputForeground: "#f5e8dc",
  previewBackground: "#2a2018",
  previewBorder: "#4a3828",
};
orangeDark.umlRenderPreview = {
  ...umlRenderPreviewDark,
  background: "#1a120e",
  canvasBackground: "#2a2018",
  border: "#4a3828",
  canvasBorder: "#4a3828",
  headerForeground: "#f5e8dc",
  toolbarForeground: "#b8a090",
  resizeHandleBackground: "#4a3828",
  resizeHandleHoverBackground: "#5c4838",
};

const patches = {
  "default.json": { light: chatVaultLight, dark: chatVaultDark },
  "solarized.json": { light: solarizedLight, dark: solarizedDark },
  "nord.json": { light: nordLight, dark: nordDark },
  "orange.json": { light: orangeLight, dark: orangeDark },
};

for (const [file, patch] of Object.entries(patches)) {
  const full = path.join(dir, file);
  const json = JSON.parse(readFileSync(full, "utf8"));
  Object.assign(json.light, patch.light);
  Object.assign(json.dark, patch.dark);
  writeFileSync(full, `${JSON.stringify(json, null, 2)}\n`);
}

console.log("Injected theme extras into presets");
