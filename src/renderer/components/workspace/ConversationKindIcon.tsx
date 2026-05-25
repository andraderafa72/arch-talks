import type { ConversationKind } from "@/types";
import { BookOpen, FileText, GitBranch } from "lucide-react";

export function ConversationKindIcon({
  kind,
  className,
}: {
  kind: ConversationKind;
  className?: string;
}) {
  if (kind === "uml") {
    return <GitBranch className={className} aria-hidden="true" />;
  }
  if (kind === "vault") {
    return <BookOpen className={className} aria-hidden="true" />;
  }
  return <FileText className={className} aria-hidden="true" />;
}
