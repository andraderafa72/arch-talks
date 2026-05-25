import { VaultSkillsScreen } from "@/components/skills/VaultSkillsScreen";
import { useVaultSkills } from "@/hooks/useVaultSkills";
import { useEditorStore } from "@/state/store";

export function VaultSkillsPage() {
  const locale = useEditorStore((state) => state.locale);
  const theme = useEditorStore((state) => state.theme);
  const {
    skills,
    selectedId,
    draft,
    loading,
    saving,
    error,
    isBuiltin,
    isDirty,
    selectSkill,
    createSkill,
    saveSkill,
    deleteSkill,
    setDraft,
  } = useVaultSkills();

  return (
    <VaultSkillsScreen
      locale={locale}
      theme={theme}
      skills={skills}
      selectedId={selectedId}
      draft={draft}
      loading={loading}
      saving={saving}
      error={error}
      isBuiltin={isBuiltin}
      isDirty={isDirty}
      onSelect={selectSkill}
      onCreate={createSkill}
      onSave={() => void saveSkill()}
      onDelete={() => void deleteSkill()}
      onDraftChange={(patch) => {
        setDraft((current) => (current ? { ...current, ...patch } : current));
      }}
    />
  );
}
