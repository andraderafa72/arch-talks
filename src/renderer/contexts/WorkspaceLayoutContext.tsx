import { createContext, useContext, type ReactNode } from "react";
import { useWorkspaceLayout } from "@/hooks/useWorkspaceLayout";

type WorkspaceLayoutContextValue = ReturnType<typeof useWorkspaceLayout>;

const WorkspaceLayoutContext = createContext<WorkspaceLayoutContextValue | null>(null);

type WorkspaceLayoutProviderProps = {
  children: ReactNode;
};

export function WorkspaceLayoutProvider({ children }: WorkspaceLayoutProviderProps) {
  const layout = useWorkspaceLayout();
  return <WorkspaceLayoutContext.Provider value={layout}>{children}</WorkspaceLayoutContext.Provider>;
}

export function useWorkspaceLayoutContext() {
  const value = useContext(WorkspaceLayoutContext);
  if (!value) {
    throw new Error("useWorkspaceLayoutContext must be used within WorkspaceLayoutProvider");
  }
  return value;
}
