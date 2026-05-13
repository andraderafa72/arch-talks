import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTemplateDraftContext } from "@/contexts/TemplateDraftContext";
import { useEditorStore } from "@/state/store";

export function HomePage() {
  const navigate = useNavigate();
  const createConversation = useEditorStore((state) => state.createConversation);
  const {
    technicalTemplates,
    selectedTemplateId,
    setSelectedTemplateId,
    startTechnicalConversation,
  } = useTemplateDraftContext();
  const startUmlConversation = () => {
    createConversation({ kind: "uml" });
    navigate("/workspace");
  };

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <div className="w-full max-w-3xl rounded-xl border border-zinc-200 bg-[#fefefe] p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold">What do you want to create?</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Choose a flow to start a new conversation and workspace.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={startUmlConversation}
            className="rounded-lg border border-zinc-200 p-4 text-left hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <div className="text-base font-semibold">UML diagram</div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Start with a `.puml` diagram file.</div>
          </button>
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
            <div className="text-base font-semibold">Technical document</div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Template is optional for document creation.</p>
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              className="mt-3 h-9 w-full rounded-md border border-zinc-200 bg-[#fefefe] px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Select template</option>
              {technicalTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <Button className="mt-3 w-full" onClick={startTechnicalConversation}>
              Create technical document
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
