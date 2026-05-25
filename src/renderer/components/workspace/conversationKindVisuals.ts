import type { ConversationKind } from "@/types";

export function conversationKindIconBoxClass(kind: ConversationKind): string {
  if (kind === "uml") {
    return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300";
  }
  if (kind === "vault") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300";
  }
  return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300";
}

export function conversationKindBadgeClass(kind: ConversationKind): string {
  if (kind === "uml") {
    return "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/80 dark:text-violet-200";
  }
  if (kind === "vault") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200";
  }
  return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/80 dark:text-sky-200";
}
