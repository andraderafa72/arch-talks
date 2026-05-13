import { TechnicalTemplatesScreen } from "@/components/templates/TechnicalTemplatesScreen";
import { useTemplateDraftContext } from "@/contexts/TemplateDraftContext";

export function TemplatesPage() {
  const {
    technicalTemplates,
    newTemplateName,
    setNewTemplateName,
    newTemplateDescription,
    setNewTemplateDescription,
    newTemplateContent,
    setNewTemplateContent,
    saveTemplate,
    templateSaveError,
    templateSaving,
  } = useTemplateDraftContext();

  return (
    <TechnicalTemplatesScreen
      templates={technicalTemplates}
      newTemplateName={newTemplateName}
      newTemplateDescription={newTemplateDescription}
      newTemplateContent={newTemplateContent}
      onNameChange={setNewTemplateName}
      onDescriptionChange={setNewTemplateDescription}
      onContentChange={setNewTemplateContent}
      onSave={() => void saveTemplate()}
      saveError={templateSaveError}
      saving={templateSaving}
    />
  );
}
