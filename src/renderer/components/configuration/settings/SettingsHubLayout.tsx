import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  configScreenHeaderBorderClass,
  configScreenListItemActiveClass,
  configScreenListItemClass,
  configScreenMutedTextClass,
  configScreenRootClass,
} from "@/lib/configScreenThemeClasses";
import { settingsStrings } from "@/lib/uiCopy";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/state/store";
import { SETTINGS_SECTION_ROUTES } from "./settingsRoutes";

export function SettingsHubLayout() {
  const locale = useEditorStore((s) => s.locale);
  const location = useLocation();
  const t = settingsStrings(locale);

  return (
    <div className={cn("flex h-full min-h-0 flex-1 flex-col overflow-hidden", configScreenRootClass)}>
      <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)]">
        <div
          className={cn(
            "col-span-2 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3",
            configScreenHeaderBorderClass,
          )}
        >
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{t.pageTitle}</h1>
            <p className={cn("truncate text-xs", configScreenMutedTextClass)}>{t.pageSubtitle}</p>
          </div>
        </div>

        <nav
          className={cn("row-start-2 flex min-h-0 flex-col overflow-y-auto border-r p-2", configScreenHeaderBorderClass)}
          aria-label={t.pageTitle}
        >
          <ul className="space-y-1">
            {SETTINGS_SECTION_ROUTES.map((section) => {
              const isActive = location.pathname === section.path;
              return (
                <li key={section.id}>
                  <NavLink
                    to={section.path}
                    end
                    className={cn(
                      "block rounded-md border px-3 py-2 text-sm transition-colors",
                      configScreenListItemClass,
                      isActive && configScreenListItemActiveClass,
                    )}
                  >
                    {section.label(locale)}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="row-start-2 min-h-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
