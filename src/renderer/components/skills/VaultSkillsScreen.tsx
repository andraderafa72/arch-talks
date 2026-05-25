import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownMath } from "@/components/markdown/MarkdownMath";
import { SkillMarkdownEditor } from "@/components/skills/SkillMarkdownEditor";
import {
  configScreenCardClass,
  configScreenHeaderBorderClass,
  configScreenListItemActiveClass,
  configScreenListItemClass,
  configScreenMutedTextClass,
  configScreenPreviewPaneClass,
  configScreenRootClass,
} from "@/lib/configScreenThemeClasses";
import { vaultSkillsCopy } from "@/lib/skillsCopy";
import { cn } from "@/lib/utils";
import type { VaultSkillDraft } from "@/hooks/useVaultSkills";
import type { ThemeMode, UiLocale } from "@/types";
import type { VaultSkill } from "@/types/vaultSkill";
import { BookOpen, Lock, Plus, Trash2 } from "lucide-react";

type VaultSkillsScreenProps = {
  locale: UiLocale;
  theme: ThemeMode;
  skills: VaultSkill[];
  selectedId: string | null;
  draft: VaultSkillDraft | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  isBuiltin: boolean;
  isDirty: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onSave: () => void;
  onDelete: () => void;
  onDraftChange: (patch: Partial<VaultSkillDraft>) => void;
};

export function VaultSkillsScreen({
  locale,
  theme,
  skills,
  selectedId,
  draft,
  loading,
  saving,
  error,
  isBuiltin,
  isDirty,
  onSelect,
  onCreate,
  onSave,
  onDelete,
  onDraftChange,
}: VaultSkillsScreenProps) {
  const copy = vaultSkillsCopy(locale);

  return (
    <div className={cn("flex h-full min-h-0 flex-1 flex-col overflow-hidden", configScreenRootClass)}>
      <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)]">
        <div
          className={cn(
            "col-span-3 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2",
            configScreenHeaderBorderClass,
          )}
        >
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{copy.pageTitle}</h2>
            <p className={cn("truncate text-xs", configScreenMutedTextClass)}>{copy.pageSubtitle}</p>
          </div>
          {error ? (
            <p className="max-w-md truncate text-xs text-red-600 dark:text-red-400" title={error}>
              {error}
            </p>
          ) : null}
        </div>

        <aside className={cn("row-start-2 flex min-h-0 flex-col border-r", configScreenHeaderBorderClass)}>
          <div className={cn("flex items-center justify-between gap-2 border-b px-3 py-2", configScreenHeaderBorderClass)}>
            <span className={cn("text-xs font-semibold uppercase tracking-wide", configScreenMutedTextClass)}>
              {copy.listHeading}
            </span>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={onCreate} title={copy.newSkill}>
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {loading ? (
              <p className={cn("px-2 py-3 text-sm", configScreenMutedTextClass)}>{copy.saving}</p>
            ) : skills.length === 0 ? (
              <p className={cn("px-2 py-3 text-sm", configScreenMutedTextClass)}>{copy.emptyList}</p>
            ) : (
              <ul className="space-y-1">
                {skills.map((skill) => {
                  const isSelected = skill.id === selectedId;
                  return (
                    <li key={skill.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(skill.id)}
                        className={cn(
                          "flex w-full flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors",
                          isSelected ? configScreenListItemActiveClass : configScreenListItemClass,
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {skill.name || copy.namePlaceholder}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 pl-5">
                          <Badge
                            className={cn(
                              "h-4 border px-1 text-[9px] font-semibold uppercase tracking-wide",
                              skill.builtin
                                ? cn("border-[var(--ui-config-border)] bg-[var(--ui-config-list-active-bg)] text-[var(--ui-config-list-active-fg)]")
                                : "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/80 dark:text-sky-200",
                            )}
                          >
                            {skill.builtin ? copy.builtinBadge : copy.customBadge}
                          </Badge>
                        </div>
                        {skill.description ? (
                          <p className={cn("line-clamp-2 pl-5 text-[11px] leading-snug", configScreenMutedTextClass)}>
                            {skill.description}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className={cn("row-start-2 flex min-h-0 min-w-0 flex-col overflow-hidden border-r", configScreenHeaderBorderClass)}>
          <div className={cn("flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2", configScreenHeaderBorderClass)}>
            <span className={cn("text-xs font-semibold uppercase tracking-wide", configScreenMutedTextClass)}>
              {copy.markdownLabel}
            </span>
            <div className="flex items-center gap-2">
              {isBuiltin ? (
                <span className={cn("inline-flex items-center gap-1 text-xs", configScreenMutedTextClass)}>
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  {copy.readOnlyHint}
                </span>
              ) : null}
              {!isBuiltin && selectedId ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-red-600 hover:text-red-700 dark:text-red-400"
                  disabled={saving}
                  onClick={() => {
                    if (window.confirm(copy.deleteConfirm)) onDelete();
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                disabled={!draft || isBuiltin || !isDirty || saving}
                onClick={onSave}
              >
                {saving ? copy.saving : copy.saveSkill}
              </Button>
            </div>
          </div>

          {!draft ? (
            <div className={cn("flex flex-1 items-center justify-center p-6 text-sm", configScreenMutedTextClass)}>
              {copy.selectSkillHint}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className={cn("shrink-0 space-y-2 border-b p-3", configScreenHeaderBorderClass)}>
                <div>
                  <label className={cn("mb-1 block text-xs font-medium", configScreenMutedTextClass)}>{copy.nameLabel}</label>
                  <Input
                    value={draft.name}
                    placeholder={copy.namePlaceholder}
                    disabled={isBuiltin}
                    onChange={(event) => onDraftChange({ name: event.target.value })}
                  />
                </div>
                <div>
                  <label className={cn("mb-1 block text-xs font-medium", configScreenMutedTextClass)}>
                    {copy.descriptionLabel}
                  </label>
                  <Input
                    value={draft.description}
                    placeholder={copy.descriptionPlaceholder}
                    disabled={isBuiltin}
                    onChange={(event) => onDraftChange({ description: event.target.value })}
                  />
                </div>
              </div>
              <div className="relative min-h-0 flex-1">
                <div className="absolute inset-0">
                  <SkillMarkdownEditor
                    key={draft.id}
                    skillId={draft.id}
                    value={draft.content}
                    theme={theme}
                    readOnly={isBuiltin}
                    onChange={(content) => onDraftChange({ content })}
                    onSave={!isBuiltin ? onSave : undefined}
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="row-start-2 flex min-h-0 min-w-0 flex-col overflow-hidden">
          <div className={cn("shrink-0 border-b px-4 py-2", configScreenHeaderBorderClass)}>
            <span className={cn("text-xs font-semibold uppercase tracking-wide", configScreenMutedTextClass)}>
              {copy.previewLabel}
            </span>
          </div>
          <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain p-4", configScreenPreviewPaneClass)}>
            {draft?.content ? (
              <MarkdownMath content={draft.content} tone="document" className="prose-sm max-w-none text-sm" />
            ) : (
              <p className={cn("text-sm", configScreenMutedTextClass)}>{copy.selectSkillHint}</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
