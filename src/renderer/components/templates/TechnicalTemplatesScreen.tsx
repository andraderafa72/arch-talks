import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#fefefe] p-6 dark:bg-zinc-950">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">Templates de documentos técnicos</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Liste e cadastre templates para usar na criação de novos documentos técnicos.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="min-h-0 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
          <div className="mb-3 text-sm font-semibold">Templates cadastrados</div>
          <div className="h-full max-h-[60vh] space-y-2 overflow-auto pr-1">
            {templates.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-300">Nenhum template cadastrado. Use o formulário ao lado para criar.</p>
            ) : null}
            {templates.map((template) => (
              <div key={template.id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
                <div className="text-sm font-medium">{template.name}</div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{template.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
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
              className="h-52 w-full rounded-md border border-zinc-200 bg-[#fefefe] p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
