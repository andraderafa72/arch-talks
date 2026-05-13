import { Button } from "@/components/ui/button";

type UnsavedTabCloseDialogProps = {
  filePath: string | null;
  getTabBasename: (path: string) => string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function UnsavedTabCloseDialog({
  filePath,
  getTabBasename,
  onCancel,
  onConfirm,
}: UnsavedTabCloseDialogProps) {
  if (!filePath) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="tool-close-unsaved-title"
        aria-describedby="tool-close-unsaved-desc"
        className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="tool-close-unsaved-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Fechar sem guardar?
        </h2>
        <p id="tool-close-unsaved-desc" className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {`O ficheiro "${getTabBasename(filePath)}" tem alterações não guardadas. Quer fechar o separador e perder essas alterações?`}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={onConfirm}>
            Fechar sem guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
