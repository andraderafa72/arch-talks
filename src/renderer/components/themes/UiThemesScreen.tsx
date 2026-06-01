import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ThemeJsonEditor } from "@/components/themes/ThemeJsonEditor";
import { ThemeNamePromptDialog } from "@/components/themes/ThemeNamePromptDialog";
import { Button } from "@/components/ui/button";
import { getKnownBuiltInThemeIds } from "@/lib/normalizeUiThemeId";
import { listThemes } from "@/lib/themeRegistry";
import { themesStrings } from "@/lib/uiCopy";
import { useEditorStore } from "@/state/store";
import type { UiLocale } from "@/types";
import { parseUiTheme, type UiThemeV1 } from "@/types/uiTheme";

type UiThemesScreenProps = {
  locale: UiLocale;
};

function themeToEditorJson(theme: UiThemeV1): string {
  if (theme.builtIn) {
    return JSON.stringify(theme, null, 2);
  }
  const { builtIn: _builtIn, ...editable } = theme;
  return JSON.stringify(editable, null, 2);
}

export function UiThemesScreen({ locale }: UiThemesScreenProps) {
  const t = themesStrings(locale);
  const themeMode = useEditorStore((s) => s.theme);
  const uiThemeId = useEditorStore((s) => s.uiThemeId);
  const customUiThemes = useEditorStore((s) => s.customUiThemes);
  const setUiThemeId = useEditorStore((s) => s.setUiThemeId);
  const saveCustomUiTheme = useEditorStore((s) => s.saveCustomUiTheme);
  const deleteCustomUiTheme = useEditorStore((s) => s.deleteCustomUiTheme);
  const duplicateUiTheme = useEditorStore((s) => s.duplicateUiTheme);

  const allThemes = useMemo(() => listThemes(customUiThemes), [customUiThemes]);
  const [selectedId, setSelectedId] = useState(uiThemeId);
  const [jsonText, setJsonText] = useState("");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const loadedIdRef = useRef<string | null>(null);

  const selectedTheme = allThemes.find((th) => th.id === selectedId) ?? allThemes[0];

  const loadEditorForTheme = useCallback((theme: UiThemeV1) => {
    setSelectedId(theme.id);
    setJsonText(themeToEditorJson(theme));
    setParseErrors([]);
    loadedIdRef.current = theme.id;
  }, []);

  const confirmDuplicate = async (name: string) => {
    if (!selectedTheme) return;
    setDuplicating(true);
    setParseErrors([]);
    try {
      const created = await duplicateUiTheme(selectedTheme.id, name);
      if (!created) {
        setParseErrors([t.duplicateFailed]);
        return;
      }
      setDuplicateOpen(false);
      loadEditorForTheme(created);
    } catch (error) {
      console.error(error);
      setParseErrors([error instanceof Error ? error.message : t.duplicateFailed]);
    } finally {
      setDuplicating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const raw = JSON.parse(jsonText) as unknown;
      const result = parseUiTheme(raw);
      if (!result.ok) {
        setParseErrors(result.errors);
        return;
      }
      if (getKnownBuiltInThemeIds().includes(result.theme.id)) {
        setParseErrors([t.reservedThemeId]);
        return;
      }
      const previousId = loadedIdRef.current ?? selectedId;
      const saved = await saveCustomUiTheme(result.theme, {
        previousId: previousId !== result.theme.id ? previousId : undefined,
      });
      if (!saved) {
        setParseErrors([t.saveFailed]);
        return;
      }
      setParseErrors([]);
      setSelectedId(result.theme.id);
      loadedIdRef.current = result.theme.id;
    } catch {
      setParseErrors([t.validationError]);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTheme || selectedTheme.builtIn) {
      window.alert(t.cannotDeleteBuiltIn);
      return;
    }
    if (!window.confirm(`Delete theme "${selectedTheme.name}"?`)) return;
    await deleteCustomUiTheme(selectedTheme.id);
    const next = listThemes(useEditorStore.getState().customUiThemes)[0];
    if (next) loadEditorForTheme(next);
  };

  const handleExport = () => {
    if (!selectedTheme) return;
    const blob = new Blob([themeToEditorJson(selectedTheme)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedTheme.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      void (async () => {
        try {
          const raw = JSON.parse(String(reader.result)) as unknown;
          const result = parseUiTheme(raw);
          if (!result.ok) {
            setParseErrors(result.errors);
            return;
          }
          if (getKnownBuiltInThemeIds().includes(result.theme.id)) {
            setParseErrors([t.reservedThemeId]);
            return;
          }
          setJsonText(JSON.stringify(result.theme, null, 2));
          setParseErrors([]);
          const saved = await saveCustomUiTheme(result.theme);
          if (!saved) {
            setParseErrors([t.saveFailed]);
            return;
          }
          setSelectedId(result.theme.id);
          loadedIdRef.current = result.theme.id;
        } catch {
          setParseErrors([t.validationError]);
        }
      })();
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (loadedIdRef.current === selectedId) return;
    const theme = allThemes.find((th) => th.id === selectedId);
    if (theme) loadEditorForTheme(theme);
  }, [selectedId, allThemes, loadEditorForTheme]);

  useEffect(() => {
    if (loadedIdRef.current !== null) return;
    const initial = allThemes.find((th) => th.id === uiThemeId) ?? allThemes[0];
    if (initial) loadEditorForTheme(initial);
  }, [allThemes, loadEditorForTheme, uiThemeId]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[var(--ui-shell-bg)] p-6 text-[var(--ui-shell-fg)]">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">{t.title}</h2>
        <p className="mt-1 text-sm text-[var(--ui-muted-fg)]">{t.subtitle}</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <div className="min-h-0 rounded-lg border border-[var(--ui-border)] p-3">
          <div className="mb-2 text-sm font-semibold">{t.selectTheme}</div>
          <ul className="max-h-[60vh] space-y-1 overflow-auto">
            {allThemes.map((theme) => {
              const isActive = theme.id === uiThemeId;
              const isSelected = theme.id === selectedId;
              return (
                <li key={theme.id}>
                  <button
                    type="button"
                    className={`w-full rounded-md border px-2 py-2 text-left text-sm ${
                      isSelected
                        ? "border-[var(--ui-file-tree-active-border)] bg-[var(--ui-file-tree-active-bg)]"
                        : "border-transparent hover:bg-[var(--ui-file-tree-hover-bg)]"
                    }`}
                    onClick={() => setSelectedId(theme.id)}
                  >
                    <div className="font-medium">{theme.name}</div>
                    <div className="text-xs text-[var(--ui-muted-fg)]">
                      {theme.builtIn ? t.builtIn : t.custom}
                      {isActive ? ` · ${t.active}` : ""}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex flex-col gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setUiThemeId(selectedId)}>
              {t.selectTheme}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!selectedTheme || duplicating}
              onClick={() => setDuplicateOpen(true)}
            >
              {duplicating ? t.duplicating : t.duplicate}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={handleExport} disabled={!selectedTheme}>
              {t.exportJson}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => importInputRef.current?.click()}
            >
              {t.importJson}
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void handleDelete()}
              disabled={selectedTheme?.builtIn}
            >
              {t.delete}
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-col rounded-lg border border-[var(--ui-border)] p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{t.editorLabel}</span>
            {selectedTheme?.builtIn ? (
              <span className="text-xs text-[var(--ui-muted-fg)]">{t.readOnlyBuiltIn}</span>
            ) : null}
          </div>
          <div className="relative h-[min(60vh,32rem)] min-h-[20rem] w-full overflow-hidden rounded-md border border-[var(--ui-border)]">
            <ThemeJsonEditor
              themeId={selectedId}
              value={jsonText}
              mode={themeMode}
              readOnly={selectedTheme?.builtIn === true}
              onChange={(next) => {
                setJsonText(next);
                setParseErrors([]);
              }}
              onSave={selectedTheme?.builtIn ? undefined : () => void handleSave()}
            />
          </div>
          {parseErrors.length > 0 ? (
            <ul className="mt-2 list-inside list-disc text-sm text-red-600 dark:text-red-400">
              {parseErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          ) : null}
          <Button
            className="mt-3 w-full sm:w-auto"
            onClick={() => void handleSave()}
            disabled={saving || selectedTheme?.builtIn}
          >
            {saving ? t.saving : t.save}
          </Button>
        </div>
      </div>

      <ThemeNamePromptDialog
        open={duplicateOpen}
        title={t.duplicate}
        label={t.duplicatePrompt}
        initialName={selectedTheme ? `${selectedTheme.name} copy` : ""}
        confirmLabel={t.duplicateConfirm}
        cancelLabel={t.duplicateCancel}
        onCancel={() => {
          if (!duplicating) setDuplicateOpen(false);
        }}
        onConfirm={(name) => void confirmDuplicate(name)}
      />
    </div>
  );
}
