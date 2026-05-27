import { topBarStrings, skillsStrings } from "@/lib/uiCopy";
import { workspaceTabTitle } from "@/lib/conversationMeta";
import type { Conversation, UiLocale } from "@/types";

export type WindowTab = {
  id: string;
  path: string;
  label: string;
  conversationId?: string;
};

export function windowTabId(pathname: string, search: string): string {
  return `route:${pathname}${search}`;
}

export function newWindowTabId(): string {
  return `tab:${crypto.randomUUID()}`;
}

export function parseRoutePath(path: string): { pathname: string; search: string } {
  const queryIndex = path.indexOf("?");
  if (queryIndex === -1) return { pathname: path, search: "" };
  return { pathname: path.slice(0, queryIndex), search: path.slice(queryIndex) };
}

export function labelForRoute(pathname: string, search: string, locale: UiLocale): string {
  const t = topBarStrings(locale);
  const skills = skillsStrings(locale);

  if (pathname === "/") return locale === "pt" ? "Início" : "Home";
  if (pathname === "/workspace") return t.workspaceEditor;
  if (pathname === "/templates") return t.templates;
  if (pathname === "/themes") return t.themes;
  if (pathname === "/daily-reports") return t.dailyReports;
  if (pathname === "/configuration/integrations") return t.integrations;
  if (pathname === "/conversations") {
    const kind = new URLSearchParams(search).get("kind");
    if (kind === "system_design") return t.systemDesignWorkspaces;
    if (kind === "technical_document") return t.latexWorkspaces;
    if (kind === "vault") return t.vaultWorkspaces;
    return t.allWorkspaces;
  }
  if (pathname === "/skills/vaults") return skills.vaultSkillsTitle;
  if (pathname === "/tools/markdown-pdf") return t.markdownToPdf;
  if (pathname === "/tools/uml-render") return t.renderUml;
  if (pathname === "/tools/latex-tectonic") return t.latexTectonic;

  return pathname;
}

export function createWindowTab(
  pathname: string,
  search: string,
  locale: UiLocale,
  options?: { id?: string; conversationId?: string; label?: string },
): WindowTab {
  const path = `${pathname}${search}`;
  return {
    id: options?.id ?? windowTabId(pathname, search),
    path,
    label: options?.label ?? labelForRoute(pathname, search, locale),
    conversationId: options?.conversationId,
  };
}

export function defaultHomeTab(locale: UiLocale): WindowTab {
  return createWindowTab("/", "", locale);
}

export function isHomeTab(tab: Pick<WindowTab, "path">): boolean {
  return parseRoutePath(tab.path).pathname === "/";
}

export function displayTabLabel(
  tab: WindowTab,
  conversations: Record<string, Conversation>,
  locale: UiLocale,
  options?: { activeTabId?: string; activeConversationId?: string },
): string {
  const { pathname } = parseRoutePath(tab.path);
  const genericWorkspaceLabel = labelForRoute("/workspace", "", locale);

  if (pathname === "/workspace") {
    const conversationId =
      tab.conversationId ??
      (tab.id === options?.activeTabId ? options.activeConversationId : undefined);
    if (conversationId) {
      const conversation = conversations[conversationId];
      if (conversation) {
        return workspaceTabTitle(conversation, locale);
      }
    }
    if (tab.label && tab.label !== genericWorkspaceLabel) {
      return tab.label;
    }
    return genericWorkspaceLabel;
  }

  return tab.label;
}
