import type { Conversation } from "@/types";

/** Scan folder path only when the user explicitly chose it (not auto-copied from project folder). */
export function getEffectiveScanFolderPath(conversation: Conversation | undefined): string | undefined {
  if (!conversation || conversation.kind !== "system_design") {
    return undefined;
  }

  const scan = conversation.scanFolderPath?.trim();
  if (!scan) return undefined;

  if (conversation.scanFolderExplicit) {
    return scan;
  }

  const root = conversation.systemDesignRootPath?.trim();
  if (!root || scan === root) {
    return undefined;
  }

  return scan;
}
