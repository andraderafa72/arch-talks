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
      <div className="min-h-0 min-w-0 border-r border-zinc-200 dark:border-zinc-700">
        {left}
      </div>
      <div
        className="min-h-0 cursor-col-resize bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
        aria-hidden="true"
        onMouseDown={onStartResize}
      />
      <div className="flex min-h-0 min-w-0 flex-col border-l border-zinc-200 bg-[#fefefe] dark:border-zinc-700 dark:bg-zinc-950">
        {right}
      </div>
    </div>
  );
}
