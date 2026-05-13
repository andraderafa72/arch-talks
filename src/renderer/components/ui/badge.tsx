import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-zinc-200 bg-[#fefefe] px-2 py-0.5 text-xs font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
        className,
      )}
      {...props}
    />
  );
}
