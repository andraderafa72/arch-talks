import { UiThemesScreen } from "@/components/themes/UiThemesScreen";
import { useEditorStore } from "@/state/store";

export function ThemesPage() {
  const locale = useEditorStore((state) => state.locale);
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <UiThemesScreen locale={locale} />
    </div>
  );
}
