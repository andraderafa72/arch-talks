import { PromptOverridesEditor } from "@/components/prompts/PromptOverridesEditor";
import { configScreenCardClass, configScreenMutedTextClass } from "@/lib/configScreenThemeClasses";
import { settingsStrings } from "@/lib/uiCopy";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/state/store";

export function SystemPromptsSettingsSection() {
  const locale = useEditorStore((s) => s.locale);
  const setGlobalPromptRevision = useEditorStore((s) => s.setGlobalPromptRevision);
  const t = settingsStrings(locale);

  return (
    <div className="flex h-full min-h-0 flex-col p-4">
      <h2 className="text-lg font-semibold">{t.navSystemPrompts}</h2>
      <p className={cn("mt-1 text-xs", configScreenMutedTextClass)}>{t.systemPromptsDescription}</p>

      <section className={cn("mt-4 min-h-0 flex-1 overflow-hidden p-0", configScreenCardClass)}>
        <PromptOverridesEditor
          scope="global"
          locale={locale}
          onRevisionChange={setGlobalPromptRevision}
          note={
            <div className={cn("rounded-md border border-[var(--ui-panel-border)] p-3 text-xs", configScreenMutedTextClass)}>
              {t.systemPromptsGlobalNote}
            </div>
          }
        />
      </section>
    </div>
  );
}
