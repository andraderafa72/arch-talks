import { useEffect, useState } from "react";
import type { WorkspaceLayoutPreferences } from "@/types/userPreferences";
import { DEFAULT_WORKSPACE_LAYOUT } from "@/types/userPreferences";

type UseWorkspaceLayoutOptions = {
  initialLayout?: WorkspaceLayoutPreferences;
  onLayoutChange?: (layout: WorkspaceLayoutPreferences) => void;
};

export function useWorkspaceLayout({
  initialLayout = DEFAULT_WORKSPACE_LAYOUT,
  onLayoutChange,
}: UseWorkspaceLayoutOptions = {}) {
  const [leftWidth, setLeftWidth] = useState(initialLayout.leftWidth);
  const [rightWidth, setRightWidth] = useState(initialLayout.rightWidth);
  const [bottomHeight, setBottomHeight] = useState(initialLayout.bottomHeight);
  const [filesSidebarWidth, setFilesSidebarWidth] = useState(initialLayout.filesSidebarWidth);

  useEffect(() => {
    onLayoutChange?.({ leftWidth, rightWidth, bottomHeight, filesSidebarWidth });
  }, [bottomHeight, filesSidebarWidth, leftWidth, onLayoutChange, rightWidth]);

  const startHorizontalDrag = (side: "left" | "right") => {
    const onMove = (event: MouseEvent) => {
      const width = window.innerWidth;
      if (side === "left") {
        setLeftWidth(Math.max(660, Math.min(900, event.clientX)));
      } else {
        setRightWidth(Math.max(300, Math.min(700, width - event.clientX)));
      }
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const startFilesSidebarDrag = () => {
    const onMove = (event: MouseEvent) => {
      setFilesSidebarWidth(Math.max(120, Math.min(480, event.clientX)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return {
    leftWidth,
    rightWidth,
    bottomHeight,
    filesSidebarWidth,
    startHorizontalDrag,
    startFilesSidebarDrag,
  };
}
