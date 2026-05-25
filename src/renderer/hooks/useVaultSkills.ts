import { useCallback, useEffect, useMemo, useState } from "react";
import type { VaultSkill, VaultSkillInput } from "@/types/vaultSkill";

const STORAGE_KEY = "rag-talks-vault-skills";

const DEFAULT_BUILTIN_SKILLS: VaultSkill[] = [
  {
    id: "builtin:vault-search",
    name: "Vault search",
    description: "Search vault notes by title, tags, and body during consumption.",
    content: `# Vault search

Search and retrieve information from a knowledge vault during chat and RAG consumption.

## When to use

- The user asks a question that should be answered from vault notes.
- You need to locate relevant markdown files before quoting or summarizing.

## Search strategy

1. Match note titles and paths against the user query.
2. Scan note bodies for keywords and wikilink targets.
3. Prefer notes with strong wikilink connectivity to the topic.

## Response rules

- Return up to **5** relevant notes with vault-relative paths.
- Include a **one-line summary** per note.
- If nothing matches, say so clearly and suggest broader terms.`,
    builtin: true,
  },
];

function readBrowserSkills(): VaultSkill[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VaultSkill[];
    return Array.isArray(parsed) ? parsed.filter((s) => s && !s.builtin) : [];
  } catch {
    return [];
  }
}

function writeBrowserSkills(userSkills: VaultSkill[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userSkills));
}

export type VaultSkillDraft = {
  id: string;
  name: string;
  description: string;
  content: string;
};

export function useVaultSkills() {
  const [skills, setSkills] = useState<VaultSkill[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<VaultSkillDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const api = window.electronApi;
      const list = api?.vaultSkillsList
        ? await api.vaultSkillsList()
        : [...DEFAULT_BUILTIN_SKILLS, ...readBrowserSkills()];
      setSkills(list);
      setSelectedId((current) => {
        if (current && list.some((skill) => skill.id === current)) return current;
        return list[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load vault skills.");
      setSkills(DEFAULT_BUILTIN_SKILLS);
      setSelectedId(DEFAULT_BUILTIN_SKILLS[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSkills();
  }, [loadSkills]);

  const selectedSkill = useMemo(
    () => skills.find((skill) => skill.id === selectedId) ?? null,
    [selectedId, skills],
  );

  useEffect(() => {
    if (!selectedSkill) {
      setDraft(null);
      return;
    }
    setDraft({
      id: selectedSkill.id,
      name: selectedSkill.name,
      description: selectedSkill.description,
      content: selectedSkill.content,
    });
  }, [selectedSkill]);

  const isBuiltin = selectedSkill?.builtin === true;
  const isDirty =
    draft &&
    selectedSkill &&
    (draft.name !== selectedSkill.name ||
      draft.description !== selectedSkill.description ||
      draft.content !== selectedSkill.content);

  const selectSkill = useCallback((id: string) => {
    setSelectedId(id);
    setError(null);
  }, []);

  const createSkill = useCallback(() => {
    const id = crypto.randomUUID();
    const blank: VaultSkill = {
      id,
      name: "",
      description: "",
      content: "# New vault skill\n\nDescribe when and how to apply this skill during vault consumption.\n",
      builtin: false,
    };
    setSkills((current) => [...current, blank]);
    setSelectedId(id);
    setDraft({
      id,
      name: blank.name,
      description: blank.description,
      content: blank.content,
    });
  }, []);

  const saveSkill = useCallback(async () => {
    if (!draft || isBuiltin) return;
    setSaving(true);
    setError(null);
    try {
      const input: VaultSkillInput = {
        id: draft.id,
        name: draft.name.trim(),
        description: draft.description.trim(),
        content: draft.content.trim(),
      };
      if (!input.name) throw new Error("Skill name is required.");
      if (!input.content) throw new Error("Skill content is required.");

      const api = window.electronApi;
      const saved = api?.vaultSkillsSave
        ? await api.vaultSkillsSave(input)
        : { ...input, builtin: false, updatedAt: new Date().toISOString() };

      if (!api?.vaultSkillsSave) {
        const userSkills = readBrowserSkills();
        const nextUser = userSkills.some((s) => s.id === saved.id)
          ? userSkills.map((s) => (s.id === saved.id ? saved : s))
          : [...userSkills, saved];
        writeBrowserSkills(nextUser);
      }

      setSkills((current) => {
        const exists = current.some((skill) => skill.id === saved.id);
        const merged = exists ? current.map((skill) => (skill.id === saved.id ? saved : skill)) : [...current, saved];
        return merged.sort((a, b) => a.name.localeCompare(b.name));
      });
      setSelectedId(saved.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save skill.");
    } finally {
      setSaving(false);
    }
  }, [draft, isBuiltin]);

  const deleteSkill = useCallback(async () => {
    if (!selectedSkill || selectedSkill.builtin) return;
    setSaving(true);
    setError(null);
    try {
      const api = window.electronApi;
      if (api?.vaultSkillsDelete) {
        await api.vaultSkillsDelete(selectedSkill.id);
      } else {
        writeBrowserSkills(readBrowserSkills().filter((skill) => skill.id !== selectedSkill.id));
      }
      setSkills((current) => {
        const remaining = current.filter((skill) => skill.id !== selectedSkill.id);
        setSelectedId(remaining[0]?.id ?? null);
        return remaining;
      });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete skill.");
    } finally {
      setSaving(false);
    }
  }, [selectedSkill]);

  return {
    skills,
    selectedSkill,
    selectedId,
    draft,
    setDraft,
    loading,
    saving,
    error,
    isBuiltin,
    isDirty: Boolean(isDirty),
    selectSkill,
    createSkill,
    saveSkill,
    deleteSkill,
    reload: loadSkills,
  };
}
