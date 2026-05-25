import { Button } from "@/components/ui/button";

function TabPanelIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{description}</p>
    </div>
  );
}

type UmlHomePanelProps = {
  onCreate: () => void;
};

export function UmlHomePanel({ onCreate }: UmlHomePanelProps) {
  return (
    <div className="space-y-4">
      <TabPanelIntro
        title="UML diagram project"
        description="Start a workspace with a default PlantUML file (diagrams/auth-flow.puml). Edit the diagram, preview renders, and chat with the assistant."
      />
      <Button className="w-full" onClick={onCreate}>
        Create UML project
      </Button>
    </div>
  );
}
