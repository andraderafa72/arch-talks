import { useEffect, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";
import { topBarStrings } from "@/lib/uiCopy";
import { cn } from "@/lib/utils";
import type { UiLocale } from "@/types";
import type { UiThemeV1 } from "@/types/uiTheme";

type UiThemePickerProps = {
  uiThemes: UiThemeV1[];
  uiThemeId: string;
  locale: UiLocale;
  onSelectTheme: (id: string) => void;
  onManageThemes: () => void;
};

export function UiThemePicker({
  uiThemes,
  uiThemeId,
  locale,
  onSelectTheme,
  onManageThemes,
}: UiThemePickerProps) {
  const t = topBarStrings(locale);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (event: MouseEvent) => {
      const el = wrapRef.current;
      if (el && !el.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative z-[100] shrink-0">
      <button
        type="button"
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--ui-header-btn-border)] bg-[var(--ui-header-btn-bg)] text-[var(--ui-header-btn-fg)] transition-colors hover:bg-[var(--ui-header-btn-hover-bg)]",
          open &&
            "border-[var(--ui-header-btn-active-border)] bg-[var(--ui-header-btn-active-bg)] text-[var(--ui-header-btn-active-fg)]",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t.selectColorTheme}
        title={t.uiThemes}
        onClick={() => setOpen((value) => !value)}
      >
        <Palette className="h-4 w-4" aria-hidden="true" />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-[200] mt-1 w-[min(16rem,calc(100vw-1.5rem))] rounded-md border border-[var(--ui-popover-border)] bg-[var(--ui-popover-bg)] text-[var(--ui-popover-fg)] shadow-lg"
          role="menu"
          aria-label={t.uiThemes}
        >
          <div className="border-b border-[var(--ui-popover-divider-border)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--ui-popover-heading-fg)]">
            {t.uiThemes}
          </div>
          <div className="max-h-72 overflow-y-auto overscroll-contain p-1">
            {uiThemes.map((uiTheme) => {
              const selected = uiThemeId === uiTheme.id;
              return (
                <button
                  key={uiTheme.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-[var(--ui-popover-hover-bg)]",
                    selected && "text-[var(--ui-popover-selected-fg)]",
                  )}
                  onClick={() => {
                    onSelectTheme(uiTheme.id);
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{uiTheme.name}</span>
                  {selected ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
          <div className="border-t border-[var(--ui-popover-divider-border)] p-1">
            <button
              type="button"
              role="menuitem"
              className="flex w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-[var(--ui-popover-hover-bg)]"
              onClick={() => {
                onManageThemes();
                setOpen(false);
              }}
            >
              {t.manageThemes}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
