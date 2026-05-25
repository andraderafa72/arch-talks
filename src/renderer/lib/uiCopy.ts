import type { UiLocale } from "@/types";

export function topBarStrings(locale: UiLocale) {
  if (locale === "pt") {
    return {
      noConversations: "Ainda sem conversas",
      newConversation: "Nova conversa",
      editorChat: "Editor / Chat",
      templates: "Modelos",
      themes: "Temas",
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
      projectPickerLabel: "Selecionar projeto",
      workspaces: "Espaços de trabalho",
      configuration: "Configuração",
      workspaceEditor: "Editor / Chat",
      workspaceEditorDesc: "Abrir o espaço de trabalho ativo",
      latexWorkspaces: "Espaços LaTeX",
      latexWorkspacesDesc: "Documentos técnicos e projetos LaTeX",
      umlWorkspaces: "Espaços UML",
      umlWorkspacesDesc: "Diagramas PlantUML",
      vaultWorkspaces: "Cofres de conhecimento",
      vaultWorkspacesDesc: "Vaults Obsidian para RAG",
      allWorkspaces: "Todos os espaços",
      newProject: "Novo projeto",
      appearance: "Aparência",
      uiThemes: "Temas da interface",
      manageThemes: "Gerir temas…",
      lightTheme: "Tema claro",
      darkTheme: "Tema escuro",
      language: "Idioma",
      skills: "Competências",
      vaultSkills: "Competências para cofres",
      vaultSkillsSubtitle: "Competências aplicáveis durante a utilização de cofres de conhecimento.",
    };
  }
  return {
    noConversations: "No conversations yet",
    newConversation: "New conversation",
    editorChat: "Editor/Chat",
    templates: "Templates",
    themes: "Themes",
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
    projectPickerLabel: "Select project",
    workspaces: "Workspaces",
    configuration: "Configuration",
    workspaceEditor: "Editor / Chat",
    workspaceEditorDesc: "Open the active workspace",
    latexWorkspaces: "LaTeX workspaces",
    latexWorkspacesDesc: "Technical documents and LaTeX projects",
    umlWorkspaces: "UML workspaces",
    umlWorkspacesDesc: "PlantUML diagrams",
    vaultWorkspaces: "Knowledge vaults",
    vaultWorkspacesDesc: "Obsidian vaults for RAG",
    allWorkspaces: "All workspaces",
    newProject: "New project",
    appearance: "Appearance",
    uiThemes: "UI themes",
    manageThemes: "Manage themes…",
    lightTheme: "Light theme",
    darkTheme: "Dark theme",
    language: "Language",
    skills: "Skills",
    vaultSkills: "Vault skills",
    vaultSkillsSubtitle: "Skills applied during knowledge vault consumption.",
  };
}

export function conversationsListStrings(locale: UiLocale) {
  if (locale === "pt") {
    return {
      title: "Espaços de trabalho",
      subtitle: "Selecione um espaço para abrir no editor/chat.",
      empty: "Ainda sem espaços de trabalho. Crie um a partir da tela inicial.",
      filteredEmpty: "Ainda sem espaços de trabalho do tipo {kind}.",
      activeLabel: "Ativo",
    };
  }
  return {
    title: "Workspaces",
    subtitle: "Select a workspace to open in the editor/chat.",
    empty: "No workspaces yet. Create one from the home screen.",
    filteredEmpty: "No {kind} workspaces yet.",
    activeLabel: "Active",
  };
}

export function skillsStrings(locale: UiLocale) {
  if (locale === "pt") {
    return {
      skills: "Competências",
      vaultSkills: "Competências para cofres",
      vaultSkillsTitle: "Competências para cofres",
      vaultSkillsSubtitle: "Competências pré-definidas aplicáveis durante a utilização de cofres de conhecimento.",
      vaultSkillsList: "Competências",
      newSkill: "Nova competência",
      deleteSkill: "Eliminar",
      saveSkill: "Guardar",
      saving: "A guardar…",
      builtinBadge: "Integrada",
      customBadge: "Personalizada",
      readOnlyHint: "Integrada — só leitura",
      skillName: "Nome",
      skillDescription: "Descrição",
      skillMarkdown: "Markdown",
      skillPreview: "Pré-visualização",
      emptySkills: "Ainda sem competências.",
      selectSkillHint: "Selecione uma competência da lista.",
      deleteSkillConfirm: "Eliminar esta competência?",
      skillNamePlaceholder: "Nome da competência",
      skillDescriptionPlaceholder: "Breve descrição",
    };
  }
  return {
    skills: "Skills",
    vaultSkills: "Vault skills",
    vaultSkillsTitle: "Vault skills",
    vaultSkillsSubtitle: "Pre-built skills applied during knowledge vault consumption.",
    vaultSkillsList: "Skills",
    newSkill: "New skill",
    deleteSkill: "Delete",
    saveSkill: "Save",
    saving: "Saving…",
    builtinBadge: "Built-in",
    customBadge: "Custom",
    readOnlyHint: "Built-in — read only",
    skillName: "Name",
    skillDescription: "Description",
    skillMarkdown: "Markdown",
    skillPreview: "Preview",
    emptySkills: "No skills yet.",
    selectSkillHint: "Select a skill from the list.",
    deleteSkillConfirm: "Delete this skill?",
    skillNamePlaceholder: "Skill name",
    skillDescriptionPlaceholder: "Short description",
  };
}

export function voiceInputStrings(locale: UiLocale) {
  if (locale === "pt") {
    return {
      startVoice: "Iniciar entrada por voz",
      stopVoice: "Parar entrada por voz",
      listening: "A ouvir…",
      transcribing: "A transcrever…",
      unsupported: "A entrada por voz requer a app desktop Electron.",
      micDenied:
        "Acesso ao microfone negado. Ative o microfone nas definições do sistema.",
      modelLoading: "A carregar o modelo de voz Whisper (primeira vez: download para disco)…",
      transcriptionFailed: "Falha na transcrição por voz",
    };
  }
  return {
    startVoice: "Start voice input",
    stopVoice: "Stop voice input",
    listening: "Listening…",
    transcribing: "Transcribing…",
    unsupported: "Voice input requires the Electron desktop app.",
    micDenied: "Microphone access denied. Enable the microphone in system settings.",
    modelLoading: "Loading Whisper speech model (first use downloads weights to disk)…",
    transcriptionFailed: "Voice transcription failed",
  };
}

export const DEFAULT_VAULT_PLAYGROUND_SKILL_ID = "builtin:vault-search";

export function vaultPlaygroundStrings(locale: UiLocale) {
  if (locale === "pt") {
    return {
      openButton: "Testar cofre",
      title: "Playground do cofre",
      subtitle: "Converse com o cofre usando um modelo local e competências de consumo.",
      skillLabel: "Competência",
      builtinSkillSuffix: " (integrada)",
      activeFile: "Ficheiro ativo",
      noActiveFile: "nenhum",
      emptyHint: "Faça perguntas sobre as notas do cofre. Toque num caminho para abrir a nota no editor.",
      clearChat: "Limpar conversa",
      close: "Fechar playground",
      openNote: "Abrir nota",
      electronRequired: "O playground requer a app Electron com IA local configurada.",
      placeholder: "Pergunte sobre o cofre ou peça para encontrar notas…",
      footerHint: "Respostas usam o modelo local selecionado e a competência escolhida.",
    };
  }
  return {
    openButton: "Test vault",
    title: "Vault playground",
    subtitle: "Converse with your vault using a local model and consumption skills.",
    skillLabel: "Skill",
    builtinSkillSuffix: " (built-in)",
    activeFile: "Active file",
    noActiveFile: "none",
    emptyHint: "Ask questions about vault notes. Click a path below a reply to open it in the editor.",
    clearChat: "Clear chat",
    close: "Close playground",
    openNote: "Open note",
    electronRequired: "The playground requires the Electron app with local AI configured.",
    placeholder: "Ask about the vault or request relevant notes…",
    footerHint: "Replies use the selected local model and consumption skill.",
  };
}

export function themesStrings(locale: UiLocale) {
  if (locale === "pt") {
    return {
      title: "Temas da interface",
      subtitle: "Escolha um tema predefinido ou crie um personalizado a partir de JSON.",
      builtIn: "Incluído",
      custom: "Personalizado",
      duplicate: "Duplicar como novo",
      delete: "Eliminar",
      exportJson: "Exportar JSON",
      importJson: "Importar JSON",
      save: "Guardar tema",
      saving: "A guardar…",
      selectTheme: "Selecionar tema",
      editorLabel: "JSON do tema",
      newThemeName: "Nome do novo tema",
      duplicatePrompt: "Nome para a cópia do tema",
      validationError: "JSON inválido",
      active: "Ativo",
      cannotDeleteBuiltIn: "Temas incluídos não podem ser eliminados.",
      readOnlyBuiltIn: "Só leitura — duplique para editar",
    };
  }
  return {
    title: "UI themes",
    subtitle: "Pick a preset theme or create a custom one from JSON.",
    builtIn: "Built-in",
    custom: "Custom",
    duplicate: "Duplicate as new",
    delete: "Delete",
    exportJson: "Export JSON",
    importJson: "Import JSON",
    save: "Save theme",
    saving: "Saving…",
    selectTheme: "Select theme",
    editorLabel: "Theme JSON",
    newThemeName: "New theme name",
    duplicatePrompt: "Name for the theme copy",
    validationError: "Invalid JSON",
    active: "Active",
    cannotDeleteBuiltIn: "Built-in themes cannot be deleted.",
    readOnlyBuiltIn: "Read-only — duplicate to edit",
  };
}
