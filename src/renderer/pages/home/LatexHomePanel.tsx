import { Button } from "@/components/ui/button";
import { TabPanelIntro } from "@/pages/home/homePanelShared";
import type { TechnicalTemplate } from "@/types";

type LatexHomePanelProps = {
  technicalTemplates: TechnicalTemplate[];
  selectedTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  onCreate: () => void;
};

export function LatexHomePanel({
  technicalTemplates,
  selectedTemplateId,
  onTemplateChange,
  onCreate,
}: LatexHomePanelProps) {
  return (
    <div className="space-y-4">
      <TabPanelIntro
        title="Technical document (LaTeX)"
        description="Start with a default main.tex or apply an optional template. Build PDF previews with Tectonic from the workspace."
      />
      <label className="block space-y-1.5 text-sm font-medium text-[var(--ui-shell-fg)]">
        Template <span className="font-normal text-[var(--ui-muted-fg)]">(optional)</span>
        <select
          value={selectedTemplateId}
          onChange={(event) => onTemplateChange(event.target.value)}
          className="mt-1 h-9 w-full rounded-md border border-[var(--ui-panel-border)] bg-[var(--ui-panel-bg)] px-3 text-sm font-normal text-[var(--ui-shell-fg)]"
        >
          <option value="">Default LaTeX (main.tex only)</option>
          {technicalTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </label>
      <Button className="w-full" onClick={onCreate}>
        Create LaTeX document
      </Button>
    </div>
  );
}
