import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ThemeNamePromptDialogProps = {
  open: boolean;
  title: string;
  label: string;
  initialName: string;
  confirmLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
};

export function ThemeNamePromptDialog({
  open,
  title,
  label,
  initialName,
  confirmLabel,
  cancelLabel,
  onCancel,
  onConfirm,
}: ThemeNamePromptDialogProps) {
  const titleId = useId();
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialName, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel, open]);

  if (!open) return null;

  const trimmed = name.trim();

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel-bg)] p-4 text-[var(--ui-shell-fg)] shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        <label className="mt-3 block text-sm text-[var(--ui-muted-fg)]">
          {label}
          <Input
            ref={inputRef}
            className="mt-1.5"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && trimmed) {
                event.preventDefault();
                onConfirm(trimmed);
              }
            }}
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" size="sm" disabled={!trimmed} onClick={() => onConfirm(trimmed)}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
