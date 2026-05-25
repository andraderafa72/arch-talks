import { useCallback, useMemo, useState } from "react";
import { FolderOpen, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getElectronApi } from "@/lib/electronBridge";
import { cn } from "@/lib/utils";
import type { VaultCategory } from "@/types";

type VaultLocationMode = "existing" | "new";

const vaultModeButtonClass = (active: boolean) =>
  cn(
    "rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
    active
      ? "border-zinc-900 bg-zinc-100 shadow-sm dark:border-zinc-300 dark:bg-zinc-800"
      : "border-zinc-200 bg-[#fefefe] hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800/80",
  );

function TabPanelIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{description}</p>
    </div>
  );
}

function FolderBrowseButton({
  label,
  selectedPath,
  emptyHint,
  onBrowse,
}: {
  label: string;
  selectedPath: string;
  emptyHint: string;
  onBrowse: () => void;
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onBrowse}
        className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-zinc-400 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 transition-colors hover:border-zinc-600 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-400 dark:hover:bg-zinc-700"
      >
        <FolderOpen className="h-4 w-4 shrink-0" aria-hidden />
        {label}
      </button>
      {selectedPath ? (
        <p
          className="rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-zinc-700 break-all dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-300"
          title={selectedPath}
        >
          {selectedPath}
        </p>
      ) : (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{emptyHint}</p>
      )}
    </div>
  );
}

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
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Vault category</p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Cannot be changed after creation.</p>
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
              className={vaultModeButtonClass(vaultCategory === cat.id)}
              aria-pressed={vaultCategory === cat.id}
            >
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{cat.title}</span>
              <p className="mt-1 text-xs font-normal text-zinc-600 dark:text-zinc-400">{cat.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <label className="block space-y-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
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
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Vault location</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setLocationMode("existing")}
            className={vaultModeButtonClass(locationMode === "existing")}
            aria-pressed={locationMode === "existing"}
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 shrink-0 text-zinc-600 dark:text-zinc-400" aria-hidden />
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Existing folder</span>
            </div>
            <p className="mt-1 text-xs font-normal text-zinc-600 dark:text-zinc-400">
              Point the vault at a folder already on your computer.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setLocationMode("new")}
            className={vaultModeButtonClass(locationMode === "new")}
            aria-pressed={locationMode === "new"}
          >
            <div className="flex items-center gap-2">
              <FolderPlus className="h-4 w-4 shrink-0 text-zinc-600 dark:text-zinc-400" aria-hidden />
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">New folder</span>
            </div>
            <p className="mt-1 text-xs font-normal text-zinc-600 dark:text-zinc-400">
              Create a new folder inside a parent directory you choose.
            </p>
          </button>
        </div>

        <div
          className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-600 dark:bg-zinc-800/40"
          role="region"
          aria-label={locationMode === "existing" ? "Existing folder settings" : "New folder settings"}
        >
          {locationMode === "existing" ? (
            <>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
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
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Pick where to create the vault, then name the new folder.
              </p>
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Parent directory
                </p>
                <FolderBrowseButton
                  label={parentPath ? "Change parent folder…" : "Choose parent folder…"}
                  selectedPath={parentPath}
                  emptyHint="No parent folder selected yet."
                  onBrowse={() => void pickDirectory().then((p) => p && setParentPath(p))}
                />
              </div>
              <label className="mt-4 block space-y-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                New folder name
                <Input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. my-product-vault"
                  className="bg-white font-normal dark:bg-zinc-900"
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
