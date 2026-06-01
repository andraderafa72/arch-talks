import { DailyReportsSettingsSection } from "@/components/configuration/settings/DailyReportsSettingsSection";
import { GeneralSettingsPanel } from "@/components/configuration/settings/GeneralSettingsPanel";
import { SystemPromptsSettingsSection } from "@/components/configuration/settings/SystemPromptsSettingsSection";
import { ToolSettingsPlaceholderPanel } from "@/components/configuration/settings/ToolSettingsPlaceholderPanel";
import { settingsStrings } from "@/lib/uiCopy";
import { useEditorStore } from "@/state/store";

export function SystemDesignSettingsSection() {
  const locale = useEditorStore((s) => s.locale);
  const t = settingsStrings(locale);
  return (
    <ToolSettingsPlaceholderPanel title={t.navSystemDesign} note={t.systemDesignNote} />
  );
}

export function LatexSettingsSection() {
  const locale = useEditorStore((s) => s.locale);
  const t = settingsStrings(locale);
  return <ToolSettingsPlaceholderPanel title={t.navLatex} />;
}

export function VaultSettingsSection() {
  const locale = useEditorStore((s) => s.locale);
  const t = settingsStrings(locale);
  return <ToolSettingsPlaceholderPanel title={t.navVault} />;
}

export function MarkdownPdfSettingsSection() {
  const locale = useEditorStore((s) => s.locale);
  const t = settingsStrings(locale);
  return <ToolSettingsPlaceholderPanel title={t.navMarkdownPdf} />;
}

export function UmlRenderSettingsSection() {
  const locale = useEditorStore((s) => s.locale);
  const t = settingsStrings(locale);
  return <ToolSettingsPlaceholderPanel title={t.navUmlRender} />;
}

export function LatexTectonicSettingsSection() {
  const locale = useEditorStore((s) => s.locale);
  const t = settingsStrings(locale);
  return <ToolSettingsPlaceholderPanel title={t.navLatexTectonic} />;
}

export {
  DailyReportsSettingsSection,
  GeneralSettingsPanel,
  SystemPromptsSettingsSection,
};
