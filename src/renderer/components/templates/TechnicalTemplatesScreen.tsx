import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  configScreenCardClass,
  configScreenInputClass,
  configScreenMutedTextClass,
  configScreenRootClass,
} from "@/lib/configScreenThemeClasses";
import { cn } from "@/lib/utils";
import type { TechnicalTemplate } from "@/types";

type TechnicalTemplatesScreenProps = {
  templates: TechnicalTemplate[];
  newTemplateName: string;
  newTemplateDescription: string;
  newTemplateContent: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSave: () => void;
  saveError?: string | null;
  saving?: boolean;
};

export function TechnicalTemplatesScreen({
  templates,
  newTemplateName,
  newTemplateDescription,
  newTemplateContent,
  onNameChange,
  onDescriptionChange,
  onContentChange,
  onSave,
  saveError = null,
  saving = false,
}: TechnicalTemplatesScreenProps) {
  return (
    <div className={cn("flex h-full min-h-0 flex-1 flex-col p-6", configScreenRootClass)}>
      <div className="mb-5">
        <h2 className="text-xl font-semibold">Templates de documentos técnicos</h2>
        <p className={cn("mt-1 text-sm", configScreenMutedTextClass)}>
          Liste e cadastre templates para usar na criação de novos documentos técnicos.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-2">
        <div className={cn("min-h-0 p-4", configScreenCardClass)}>
          <div className="mb-3 text-sm font-semibold">Templates cadastrados</div>
          <div className="h-full max-h-[60vh] space-y-2 overflow-auto pr-1">
            {templates.length === 0 ? (
              <p className={cn("text-sm", configScreenMutedTextClass)}>
                Nenhum template cadastrado. Use o formulário ao lado para criar.
              </p>
            ) : null}
            {templates.map((template) => (
              <div key={template.id} className={cn("rounded-md border p-3", configScreenCardClass)}>
                <div className="text-sm font-medium">{template.name}</div>
                <div className={cn("mt-1 text-xs", configScreenMutedTextClass)}>{template.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={cn("p-4", configScreenCardClass)}>
          <div className="mb-3 text-sm font-semibold">Cadastrar novo template</div>
          <div className="space-y-2">
            <Input placeholder="Nome do template" value={newTemplateName} onChange={(event) => onNameChange(event.target.value)} />
            <Input
              placeholder="Descrição do template"
              value={newTemplateDescription}
              onChange={(event) => onDescriptionChange(event.target.value)}
            />
            <textarea
              value={newTemplateContent}
              onChange={(event) => onContentChange(event.target.value)}
              className={cn("h-52 w-full rounded-md border p-2 text-sm", configScreenInputClass)}
            />
            {saveError ? <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p> : null}
            <Button className="w-full" onClick={onSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar template"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
