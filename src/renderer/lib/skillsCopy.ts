import { skillsStrings } from "@/lib/uiCopy";
import type { UiLocale } from "@/types";

export function vaultSkillsCopy(locale: UiLocale) {
  const t = skillsStrings(locale);
  return {
    pageTitle: t.vaultSkillsTitle,
    pageSubtitle: t.vaultSkillsSubtitle,
    listHeading: t.vaultSkillsList,
    newSkill: t.newSkill,
    deleteSkill: t.deleteSkill,
    saveSkill: t.saveSkill,
    saving: t.saving,
    builtinBadge: t.builtinBadge,
    customBadge: t.customBadge,
    readOnlyHint: t.readOnlyHint,
    nameLabel: t.skillName,
    descriptionLabel: t.skillDescription,
    markdownLabel: t.skillMarkdown,
    previewLabel: t.skillPreview,
    emptyList: t.emptySkills,
    selectSkillHint: t.selectSkillHint,
    deleteConfirm: t.deleteSkillConfirm,
    namePlaceholder: t.skillNamePlaceholder,
    descriptionPlaceholder: t.skillDescriptionPlaceholder,
  };
}
