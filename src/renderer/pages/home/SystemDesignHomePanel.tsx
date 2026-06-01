import { useCallback, useMemo, useState } from "react";
import { FolderOpen, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getElectronApi } from "@/lib/electronBridge";
import { FolderBrowseButton, TabPanelIntro, homeOptionButtonClass } from "@/pages/home/homePanelShared";

type SaveLocationMode = "existing" | "new";

type SystemDesignHomePanelProps = {
  onCreate: (options: {
    projectName: string;
    locationMode: SaveLocationMode;
    existingRootPath: string;
    parentPath: string;
    newFolderName: string;
  }) => Promise<void>;
};

export function SystemDesignHomePanel({ onCreate }: SystemDesignHomePanelProps) {
  const [projectName, setProjectName] = useState("");
  const [locationMode, setLocationMode] = useState<SaveLocationMode>("existing");
  const [existingFolderPath, setExistingFolderPath] = useState("");
  const [parentPath, setParentPath] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const pickDirectory = useCallback(async (): Promise<string | null> => {
    const api = getElectronApi();
    if (!api?.pickDirectory && !api?.vaultPickDirectory) return null;
    const result = api.pickDirectory ? await api.pickDirectory() : await api.vaultPickDirectory!();
    if (result.ok) return result.path;
    return null;
  }, []);

  const saveFolderPath = useMemo(() => {
    if (locationMode === "existing") return existingFolderPath.trim();
    const parent = parentPath.trim();
    const folder = newFolderName.trim();
    if (!parent || !folder) return "";
    return `${parent.replace(/[/\\]+$/, "")}/${folder}`;
  }, [existingFolderPath, locationMode, newFolderName, parentPath]);

  const canCreate = Boolean(projectName.trim() && saveFolderPath);

  const handleCreate = async () => {
    if (!canCreate) return;
    setError(null);
    setCreating(true);
    try {
      await onCreate({
        projectName: projectName.trim(),
        locationMode,
        existingRootPath: existingFolderPath.trim(),
        parentPath: parentPath.trim(),
        newFolderName: newFolderName.trim(),
      });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create system design project");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <TabPanelIntro
        title="System design project"
        description="Name your workspace and choose where it will be saved on disk. You can capture system context in SYSTEM.md and build PlantUML diagrams aligned with your architecture."
      />

      <label className="block space-y-1.5 text-sm font-medium text-[var(--ui-shell-fg)]">
        Project name
        <Input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="e.g. Billing platform design"
          className="border-[var(--ui-panel-border)] bg-[var(--ui-panel-bg)] font-normal text-[var(--ui-shell-fg)]"
        />
      </label>

      <div>
        <p className="text-sm font-medium text-[var(--ui-shell-fg)]">Save location</p>
        <p className="mt-1 text-xs text-[var(--ui-muted-fg)]">Choose an existing folder or create a new one for this workspace.</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setLocationMode("existing")}
            className={homeOptionButtonClass(locationMode === "existing")}
            aria-pressed={locationMode === "existing"}
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 shrink-0 text-[var(--ui-muted-fg)]" aria-hidden />
              <span className="text-sm font-semibold text-[var(--ui-shell-fg)]">Existing folder</span>
            </div>
            <p className="mt-1 text-xs font-normal text-[var(--ui-muted-fg)]">
              Save the workspace inside a folder already on your computer.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setLocationMode("new")}
            className={homeOptionButtonClass(locationMode === "new")}
            aria-pressed={locationMode === "new"}
          >
            <div className="flex items-center gap-2">
              <FolderPlus className="h-4 w-4 shrink-0 text-[var(--ui-muted-fg)]" aria-hidden />
              <span className="text-sm font-semibold text-[var(--ui-shell-fg)]">New folder</span>
            </div>
            <p className="mt-1 text-xs font-normal text-[var(--ui-muted-fg)]">
              Create a new folder inside a parent directory you choose.
            </p>
          </button>
        </div>

        <div
          className="mt-3 rounded-lg border border-[var(--ui-panel-border)] bg-[var(--ui-header-btn-active-bg)] p-4"
          role="region"
          aria-label={locationMode === "existing" ? "Existing folder settings" : "New folder settings"}
        >
          {locationMode === "existing" ? (
            <>
              <p className="text-sm text-[var(--ui-muted-fg)]">
                Pick the folder where this system design workspace will be saved.
              </p>
              <div className="mt-3">
                <FolderBrowseButton
                  label={existingFolderPath ? "Change save folder…" : "Choose save folder…"}
                  selectedPath={existingFolderPath}
                  emptyHint="No folder selected yet. Click the button above to browse."
                  onBrowse={() => void pickDirectory().then((path) => path && setExistingFolderPath(path))}
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-[var(--ui-muted-fg)]">
                Pick where to create the workspace folder, then name the new folder.
              </p>
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--ui-muted-fg)]">
                  Parent directory
                </p>
                <FolderBrowseButton
                  label={parentPath ? "Change parent folder…" : "Choose parent folder…"}
                  selectedPath={parentPath}
                  emptyHint="No parent folder selected yet."
                  onBrowse={() => void pickDirectory().then((path) => path && setParentPath(path))}
                />
              </div>
              <label className="mt-4 block space-y-1.5 text-sm font-medium text-[var(--ui-shell-fg)]">
                New folder name
                <Input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. billing-platform-design"
                  className="border-[var(--ui-panel-border)] bg-[var(--ui-panel-bg)] font-normal text-[var(--ui-shell-fg)]"
                />
              </label>
              {saveFolderPath ? (
                <p className="mt-3 text-xs text-[var(--ui-muted-fg)]">
                  Will save to{" "}
                  <code className="font-mono text-[var(--ui-shell-fg)]">{saveFolderPath}</code>
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <Button className="w-full" disabled={!canCreate || creating} onClick={() => void handleCreate()}>
        {creating ? "Creating project…" : "Create system design project"}
      </Button>
    </div>
  );
}
