import { useMemo } from "react";
import { buildSimpleLineDiff } from "@/lib/diff";
import { applyPatch } from "@/lib/patchEngine";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Patch } from "@/types";

type DiffPanelProps = {
  patch: Patch | null;
  fileContent: string;
};

export function DiffPanel({ patch, fileContent }: DiffPanelProps) {
  const data = useMemo(() => {
    if (!patch) return null;
    try {
      const patched = applyPatch(fileContent, patch);
      return buildSimpleLineDiff(fileContent, patched);
    } catch (error) {
      return [
        {
          kind: "remove" as const,
          value: error instanceof Error ? error.message : "Patch could not be previewed",
        },
      ];
    }
  }, [fileContent, patch]);

  if (!patch || !data) {
    return (
      <div className="h-full border-t border-zinc-200 bg-[#fefefe] p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
        No pending patch
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-zinc-200 bg-[#fefefe] dark:border-zinc-700 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-3 py-2 text-sm font-semibold dark:border-zinc-700">
        Diff Preview ({patch.file})
      </div>
      <ScrollArea className="min-h-0 flex-1 p-3">
        <div className="font-mono text-xs">
          {data.map((line, index) => (
            <div
              key={`${index}-${line.kind}`}
              className={`whitespace-pre-wrap px-2 py-0.5 ${
                line.kind === "add"
                  ? "bg-green-50 text-green-700"
                  : line.kind === "remove"
                    ? "bg-red-50 text-red-700"
                    : "text-zinc-600 dark:text-zinc-300"
              }`}
            >
              {line.kind === "add" ? "+" : line.kind === "remove" ? "-" : " "} {line.value}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
