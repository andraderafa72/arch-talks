import { Button } from "@/components/ui/button";

function TabPanelIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{description}</p>
    </div>
  );
}

type SystemDesignHomePanelProps = {
  onCreate: () => void;
};

export function SystemDesignHomePanel({ onCreate }: SystemDesignHomePanelProps) {
  return (
    <div className="space-y-4">
      <TabPanelIntro
        title="System design project"
        description="Start a workspace to capture system context in SYSTEM.md and build PlantUML diagrams aligned with your architecture."
      />
      <Button className="w-full" onClick={onCreate}>
        Create system design project
      </Button>
    </div>
  );
}
