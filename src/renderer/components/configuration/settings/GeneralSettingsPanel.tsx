import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SPEECH_MODEL_OPTIONS, type SpeechModelId } from "../../../../../shared/speechModels.ts";
import { configScreenCardClass, configScreenMutedTextClass } from "@/lib/configScreenThemeClasses";
import { settingsStrings } from "@/lib/uiCopy";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/state/store";
import type { UiLocale } from "@/types";

function speechModelLabel(locale: UiLocale, id: SpeechModelId): string {
  const t = settingsStrings(locale);
  switch (id) {
    case "Xenova/whisper-tiny":
      return t.speechModelTiny;
    case "Xenova/whisper-base":
      return t.speechModelBase;
    case "Xenova/whisper-small":
      return t.speechModelSmall;
    case "Xenova/whisper-medium":
      return t.speechModelMedium;
    default:
      return id;
  }
}

export function GeneralSettingsPanel() {
  const locale = useEditorStore((s) => s.locale);
  const speechModelId = useEditorStore((s) => s.speechModelId);
  const setSpeechModelId = useEditorStore((s) => s.setSpeechModelId);
  const t = settingsStrings(locale);
  const hasElectron = typeof window !== "undefined" && Boolean(window.electronApi?.speechSetModelId);

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold">{t.navGeneral}</h2>

      <section className={cn("mt-4 p-4", configScreenCardClass)}>
        <h3 className="text-sm font-medium">{t.transcriptionModel}</h3>
        <p className={cn("mt-1 text-xs", configScreenMutedTextClass)}>{t.transcriptionModelDesc}</p>

        <div className="mt-3 max-w-md">
          <Select
            value={speechModelId}
            onValueChange={(value) => setSpeechModelId(value)}
            disabled={!hasElectron}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPEECH_MODEL_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {speechModelLabel(locale, option.id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!hasElectron ? (
          <p className={cn("mt-2 text-xs", configScreenMutedTextClass)}>{t.transcriptionElectronNote}</p>
        ) : null}
      </section>
    </div>
  );
}
