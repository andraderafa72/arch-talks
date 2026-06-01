import { configScreenCardClass, configScreenMutedTextClass } from "@/lib/configScreenThemeClasses";
import { settingsStrings } from "@/lib/uiCopy";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/state/store";

type ToolSettingsPlaceholderPanelProps = {
  title: string;
  note?: string;
};

export function ToolSettingsPlaceholderPanel({ title, note }: ToolSettingsPlaceholderPanelProps) {
  const locale = useEditorStore((s) => s.locale);
  const t = settingsStrings(locale);

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <section className={cn("mt-4 p-4", configScreenCardClass)}>
        <h3 className="text-sm font-medium">{t.placeholderTitle}</h3>
        <p className={cn("mt-2 text-sm", configScreenMutedTextClass)}>{note ?? t.placeholderBody}</p>
      </section>
    </div>
  );
}
