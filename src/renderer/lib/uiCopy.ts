import type { UiLocale } from "@/types";

export function topBarStrings(locale: UiLocale) {
  if (locale === "pt") {
    return {
      noConversations: "Ainda sem conversas",
      newConversation: "Nova conversa",
      editorChat: "Editor / Chat",
      templates: "Modelos",
      conversations: "Conversas",
      tools: "Ferramentas",
      markdownToPdf: "Markdown para PDF",
      renderUml: "Renderizar UML",
      latexTectonic: "LaTeX (Tectonic)",
      saved: "Guardado",
      unsaved: "Alterações por guardar",
      toggleTheme: "Alternar tema",
      applyPatch: "Aplicar patch",
      languageSelect: "Idioma da interface",
    };
  }
  return {
    noConversations: "No conversations yet",
    newConversation: "New conversation",
    editorChat: "Editor/Chat",
    templates: "Templates",
    conversations: "Conversations",
    tools: "Tools",
    markdownToPdf: "Markdown to PDF",
    renderUml: "Render UML",
    latexTectonic: "LaTeX (Tectonic)",
    saved: "Saved",
    unsaved: "Unsaved changes",
    toggleTheme: "Toggle theme",
    applyPatch: "Apply Patch",
    languageSelect: "Interface language",
  };
}
