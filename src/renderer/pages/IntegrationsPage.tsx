import { IntegrationsPanel } from "@/components/configuration/IntegrationsPanel";
import { useEditorStore } from "@/state/store";

export function IntegrationsPage() {
  const locale = useEditorStore((state) => state.locale);
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <IntegrationsPanel locale={locale} />
    </div>
  );
}
