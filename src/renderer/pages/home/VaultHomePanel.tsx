import { useCallback, useMemo, useState } from "react";
import { FolderOpen, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getElectronApi } from "@/lib/electronBridge";
import { FolderBrowseButton, TabPanelIntro, homeOptionButtonClass } from "@/pages/home/homePanelShared";
import type { VaultCategory } from "@/types";

type VaultLocationMode = "existing" | "new";

type VaultHomePanelProps = {
  onCreate: (options: {
    vaultName: string;
    category: VaultCategory;
    locationMode: VaultLocationMode;
    existingRootPath: string;
    parentPath: string;
    newFolderName: string;
  }) => Promise<void>;
};

export function VaultHomePanel({ onCreate }: VaultHomePanelProps) {
  const [vaultName, setVaultName] = useState("");
  const [vaultCategory, setVaultCategory] = useState<VaultCategory | null>(null);
  const [locationMode, setLocationMode] = useState<VaultLocationMode>("existing");
  const [existingRootPath, setExistingRootPath] = useState("");
  const [parentPath, setParentPath] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [creatingVault, setCreatingVault] = useState(false);

  const pickDirectory = useCallback(async (): Promise<string | null> => {
    const api = getElectronApi();
    if (!api?.vaultPickDirectory) return null;
    const result = await api.vaultPickDirectory();
    if (result.ok) return result.path;
    return null;
  }, []);

  const canCreateVault = useMemo(() => {
    if (!vaultName.trim() || !vaultCategory) return false;
    if (locationMode === "existing") return Boolean(existingRootPath.trim());
    return Boolean(parentPath.trim() && newFolderName.trim());
  }, [vaultName, vaultCategory, locationMode, existingRootPath, parentPath, newFolderName]);

  const handleCreate = async () => {
    if (!canCreateVault || !vaultCategory) return;
    setVaultError(null);
    setCreatingVault(true);
    try {
      await onCreate({
        vaultName: vaultName.trim(),
        category: vaultCategory,
        locationMode,
        existingRootPath,
        parentPath,
        newFolderName,
      });
    } catch (error) {
      setVaultError(error instanceof Error ? error.message : "Failed to create vault");
    } finally {
      setCreatingVault(false);
    }
  };

  return (
    <div className="space-y-4">
      <TabPanelIntro
        title="Knowledge vault"
        description="Point the vault at any folder on disk. New vaults get arch-config.json with an immutable category; existing folders can be opened and categorized once."
      />

      <div>
        <p className="text-sm font-medium text-[var(--ui-shell-fg)]">Vault category</p>
        <p className="mt-1 text-xs text-[var(--ui-muted-fg)]">Cannot be changed after creation.</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(
            [
              {
                id: "business" as const,
                title: "Business",
                desc: "Domains and capabilities (e.g. billing/, logistics/)",
              },
              {
                id: "technical" as const,
                title: "Technical",
                desc: "Applications and modules (e.g. billing-service/)",
              },
              {
                id: "project" as const,
                title: "Project",
                desc: "Execution layer with implementation mappings",
              },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setVaultCategory(cat.id)}
              className={homeOptionButtonClass(vaultCategory === cat.id)}
              aria-pressed={vaultCategory === cat.id}
            >
              <span className="text-sm font-semibold text-[var(--ui-shell-fg)]">{cat.title}</span>
              <p className="mt-1 text-xs font-normal text-[var(--ui-muted-fg)]">{cat.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <label className="block space-y-1.5 text-sm font-medium text-[var(--ui-shell-fg)]">
        Vault name
        <Input
          type="text"
          value={vaultName}
          onChange={(e) => setVaultName(e.target.value)}
          placeholder="e.g. Product knowledge"
          className="font-normal"
        />
      </label>

      <div>
        <p className="text-sm font-medium text-[var(--ui-shell-fg)]">Vault location</p>
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
              Point the vault at a folder already on your computer.
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
                Open any existing folder as your vault. Markdown notes are loaded automatically; other files appear
                when you switch the sidebar to &quot;All files&quot;.
              </p>
              <div className="mt-3">
                <FolderBrowseButton
                  label={existingRootPath ? "Change vault folder…" : "Choose vault folder…"}
                  selectedPath={existingRootPath}
                  emptyHint="No folder selected yet. Click the button above to browse."
                  onBrowse={() => void pickDirectory().then((p) => p && setExistingRootPath(p))}
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-[var(--ui-muted-fg)]">
                Pick where to create the vault, then name the new folder.
              </p>
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--ui-muted-fg)]">
                  Parent directory
                </p>
                <FolderBrowseButton
                  label={parentPath ? "Change parent folder…" : "Choose parent folder…"}
                  selectedPath={parentPath}
                  emptyHint="No parent folder selected yet."
                  onBrowse={() => void pickDirectory().then((p) => p && setParentPath(p))}
                />
              </div>
              <label className="mt-4 block space-y-1.5 text-sm font-medium text-[var(--ui-shell-fg)]">
                New folder name
                <Input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. my-product-vault"
                  className="border-[var(--ui-panel-border)] bg-[var(--ui-panel-bg)] font-normal text-[var(--ui-shell-fg)]"
                />
              </label>
            </>
          )}
        </div>
      </div>

      {vaultError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {vaultError}
        </p>
      ) : null}

      <Button className="w-full" disabled={!canCreateVault || creatingVault} onClick={() => void handleCreate()}>
        {creatingVault ? "Creating vault…" : "Create knowledge vault"}
      </Button>
    </div>
  );
}
