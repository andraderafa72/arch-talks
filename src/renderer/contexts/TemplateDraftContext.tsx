import { createContext, useContext, useState, type ReactNode } from "react";
import { createTemplate } from "@/api/templates";
import { useEditorStore } from "@/state/store";
import type { TechnicalTemplate } from "@/types";

type TemplateDraftContextValue = {
  technicalTemplates: TechnicalTemplate[];
  selectedTemplateId: string;
  setSelectedTemplateId: (value: string) => void;
  newTemplateName: string;
  setNewTemplateName: (value: string) => void;
  newTemplateDescription: string;
  setNewTemplateDescription: (value: string) => void;
  newTemplateContent: string;
  setNewTemplateContent: (value: string) => void;
  templateSaveError: string | null;
  templateSaving: boolean;
  startTechnicalConversation: () => void;
  saveTemplate: () => Promise<void>;
};

const TemplateDraftContext = createContext<TemplateDraftContextValue | null>(null);

type TemplateDraftProviderProps = {
  technicalTemplates: TechnicalTemplate[];
  addTechnicalTemplate: (template: TechnicalTemplate) => void;
  createConversation: (options: { kind: "technical_document"; templateId?: string }) => void;
  onOpenWorkspace: (conversationId: string, label?: string) => void;
  children: ReactNode;
};

export function TemplateDraftProvider({
  technicalTemplates,
  addTechnicalTemplate,
  createConversation,
  onOpenWorkspace,
  children,
}: TemplateDraftProviderProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("\\section{Title}\nWrite your document here.\n");
  const [templateSaveError, setTemplateSaveError] = useState<string | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);

  const startTechnicalConversation = () => {
    createConversation({
      kind: "technical_document",
      templateId: selectedTemplateId || undefined,
    });
    const documentId = useEditorStore.getState().activeConversationId;
    const conversation = useEditorStore.getState().conversations[documentId];
    onOpenWorkspace(documentId, conversation?.title);
  };

  const saveTemplate = async () => {
    const name = newTemplateName.trim();
    const description = newTemplateDescription.trim();
    if (!name || !description) return;
    setTemplateSaveError(null);
    setTemplateSaving(true);
    try {
      const created = await createTemplate({
        name,
        description,
        files: { "main.tex": newTemplateContent },
      });
      addTechnicalTemplate(created);
      setNewTemplateName("");
      setNewTemplateDescription("");
    } catch (error) {
      setTemplateSaveError(error instanceof Error ? error.message : "Failed to save template.");
    } finally {
      setTemplateSaving(false);
    }
  };

  return (
    <TemplateDraftContext.Provider
      value={{
        technicalTemplates,
        selectedTemplateId,
        setSelectedTemplateId,
        newTemplateName,
        setNewTemplateName,
        newTemplateDescription,
        setNewTemplateDescription,
        newTemplateContent,
        setNewTemplateContent,
        templateSaveError,
        templateSaving,
        startTechnicalConversation,
        saveTemplate,
      }}
    >
      {children}
    </TemplateDraftContext.Provider>
  );
}

export function useTemplateDraftContext() {
  const value = useContext(TemplateDraftContext);
  if (!value) {
    throw new Error("useTemplateDraftContext must be used within TemplateDraftProvider");
  }
  return value;
}
