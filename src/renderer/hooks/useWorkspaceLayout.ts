import { useState } from "react";

export function useWorkspaceLayout() {
  const [leftWidth, setLeftWidth] = useState(680);
  const [rightWidth, setRightWidth] = useState(380);
  const [bottomHeight, setBottomHeight] = useState(260);

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

  const startVerticalDrag = () => {
    const onMove = (event: MouseEvent) => {
      const available = window.innerHeight - 120;
      const next = Math.max(160, Math.min(420, available - event.clientY));
      setBottomHeight(next);
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
    startHorizontalDrag,
    startVerticalDrag,
  };
}
