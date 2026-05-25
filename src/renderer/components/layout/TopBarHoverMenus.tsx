import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";

export type HoverMenuItem = {
  id: string;
  label: string;
  description?: string;
  selected?: boolean;
  onSelect: () => void;
};

export type HoverMenuGroup = {
  heading?: string;
  items: HoverMenuItem[];
};

export type HoverMenuDefinition = {
  id: string;
  label: string;
  active?: boolean;
  groups: HoverMenuGroup[];
};

type TopBarHoverMenusProps = {
  menus: HoverMenuDefinition[];
};

const CLOSE_DELAY_MS = 120;

function MenuPanel({ groups, onSelect }: { groups: HoverMenuGroup[]; onSelect: () => void }) {
  return (
    <div
      className="min-w-[14rem] max-h-80 overflow-y-auto overscroll-contain py-1"
      role="menu"
    >
      {groups.map((group, groupIndex) => (
        <div
          key={group.heading ?? groupIndex}
          className={groupIndex > 0 ? "mt-1 border-t border-[var(--ui-popover-divider-border)] pt-1" : undefined}
        >
          {group.heading ? (
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ui-popover-heading-fg)]">
              {group.heading}
            </div>
          ) : null}
          {group.items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--ui-popover-hover-bg)]"
              onClick={() => {
                item.onSelect();
                onSelect();
              }}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[var(--ui-popover-fg)]">{item.label}</span>
                {item.description ? (
                  <span className="mt-0.5 block text-xs text-[var(--ui-popover-muted-fg)]">{item.description}</span>
                ) : null}
              </span>
              {item.selected ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ui-popover-selected-fg)]" aria-hidden="true" />
              ) : null}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export function TopBarHoverMenus({ menus }: TopBarHoverMenusProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [panelLeft, setPanelLeft] = useState(0);
  const navRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const closeTimerRef = useRef<number | undefined>(undefined);

  const updatePanelPosition = useCallback((menuId: string) => {
    const nav = navRef.current;
    const trigger = triggerRefs.current.get(menuId);
    if (!nav || !trigger) return;
    const navRect = nav.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    setPanelLeft(triggerRect.left - navRect.left);
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== undefined) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setOpenMenuId(null), CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  const openMenu = useCallback(
    (menuId: string) => {
      clearCloseTimer();
      setOpenMenuId(menuId);
      updatePanelPosition(menuId);
    },
    [clearCloseTimer, updatePanelPosition],
  );

  useLayoutEffect(() => {
    if (!openMenuId) return;
    updatePanelPosition(openMenuId);
  }, [openMenuId, menus, updatePanelPosition]);

  useEffect(() => {
    if (!openMenuId) return;
    const onResize = () => updatePanelPosition(openMenuId);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [openMenuId, updatePanelPosition]);

  useEffect(() => {
    if (!openMenuId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenuId(null);
    };
    const onDocMouseDown = (event: MouseEvent) => {
      const el = navRef.current;
      if (el && !el.contains(event.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onDocMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onDocMouseDown);
    };
  }, [openMenuId]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const activeMenu = menus.find((menu) => menu.id === openMenuId);

  return (
    <div
      ref={navRef}
      className="relative z-[100] flex shrink-0 items-center"
      onMouseEnter={clearCloseTimer}
      onMouseLeave={scheduleClose}
    >
      <div className="flex items-center" role="menubar">
        {menus.map((menu) => {
          const isOpen = openMenuId === menu.id;
          return (
            <HoverMenuTrigger
              key={menu.id}
              ref={(element) => {
                if (element) triggerRefs.current.set(menu.id, element);
                else triggerRefs.current.delete(menu.id);
              }}
              label={menu.label}
              isOpen={isOpen}
              isActive={menu.active ?? false}
              onOpen={() => openMenu(menu.id)}
            />
          );
        })}
      </div>

      {activeMenu ? (
        <div
          className="absolute top-full z-[200] pt-1 transition-[left] duration-150 ease-out"
          style={{ left: panelLeft }}
          onMouseEnter={clearCloseTimer}
        >
          <div className="rounded-md border border-[var(--ui-popover-border)] bg-[var(--ui-popover-bg)] text-[var(--ui-popover-fg)] shadow-lg">
            <MenuPanel groups={activeMenu.groups} onSelect={() => setOpenMenuId(null)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

const HoverMenuTrigger = forwardRef<
  HTMLButtonElement,
  {
    label: string;
    isOpen: boolean;
    isActive: boolean;
    onOpen: () => void;
  }
>(function HoverMenuTrigger({ label, isOpen, isActive, onOpen }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={isOpen}
      className={cn(
        "inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors",
        isOpen || isActive
          ? "border-[var(--ui-header-btn-active-border)] bg-[var(--ui-header-btn-active-bg)] text-[var(--ui-header-btn-active-fg)]"
          : "border-transparent bg-transparent text-[var(--ui-header-btn-fg)] hover:bg-[var(--ui-header-btn-hover-bg)]",
      )}
      onMouseEnter={onOpen}
      onFocus={onOpen}
    >
      {label}
      <ChevronDown
        className={cn("h-4 w-4 opacity-70 transition-transform", isOpen && "rotate-180")}
        aria-hidden="true"
      />
    </button>
  );
});
