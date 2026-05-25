import { createContext, useContext, type ReactNode } from "react";
import { useWorkspaceLayout } from "@/hooks/useWorkspaceLayout";
import type { WorkspaceLayoutPreferences } from "@/types/userPreferences";

type WorkspaceLayoutContextValue = ReturnType<typeof useWorkspaceLayout>;

const WorkspaceLayoutContext = createContext<WorkspaceLayoutContextValue | null>(null);

type WorkspaceLayoutProviderProps = {
  children: ReactNode;
  initialLayout?: WorkspaceLayoutPreferences;
};

export function WorkspaceLayoutProvider({ children, initialLayout }: WorkspaceLayoutProviderProps) {
  const layout = useWorkspaceLayout({ initialLayout });
  return <WorkspaceLayoutContext.Provider value={layout}>{children}</WorkspaceLayoutContext.Provider>;
}

export function useWorkspaceLayoutContext() {
  const value = useContext(WorkspaceLayoutContext);
  if (!value) {
    throw new Error("useWorkspaceLayoutContext must be used within WorkspaceLayoutProvider");
  }
  return value;
}
