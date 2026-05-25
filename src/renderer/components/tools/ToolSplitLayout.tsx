import type { ReactNode } from "react";

type ToolSplitLayoutProps = {
  leftWidth: number;
  onStartResize: () => void;
  left: ReactNode;
  right: ReactNode;
};

export function ToolSplitLayout({ leftWidth, onStartResize, left, right }: ToolSplitLayoutProps) {
  return (
    <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: `${leftWidth}px 6px minmax(0,1fr)` }}>
      <div className="min-h-0 min-w-0 border-r border-[var(--ui-uml-preview-border)]">
        {left}
      </div>
      <div
        className="min-h-0 cursor-col-resize bg-[var(--ui-uml-preview-resize-handle)] hover:bg-[var(--ui-uml-preview-resize-handle-hover)]"
        aria-hidden="true"
        onMouseDown={onStartResize}
      />
      <div className="flex min-h-0 min-w-0 flex-col border-l border-[var(--ui-uml-preview-border)] bg-[var(--ui-uml-preview-bg)]">
        {right}
      </div>
    </div>
  );
}
