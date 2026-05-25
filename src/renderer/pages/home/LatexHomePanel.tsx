import { Button } from "@/components/ui/button";
import type { TechnicalTemplate } from "@/types";

function TabPanelIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{description}</p>
    </div>
  );
}

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
      <label className="block space-y-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Template <span className="font-normal text-zinc-500">(optional)</span>
        <select
          value={selectedTemplateId}
          onChange={(event) => onTemplateChange(event.target.value)}
          className="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-[#fefefe] px-3 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-900"
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
