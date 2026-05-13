import type { Patch } from "@/types";

export function applyPatch(content: string, patch: Patch): string {
  let next = content;

  for (const change of patch.changes) {
    if (change.type === "replace_all") {
      next = change.content;
      continue;
    }

    if (change.type === "replace_block") {
      if (!next.includes(change.target)) {
        throw new Error(`replace_block target not found in ${patch.file}`);
      }
      next = next.replace(change.target, change.content);
      continue;
    }

    if (change.type === "insert_after") {
      const idx = next.indexOf(change.anchor);
      if (idx === -1) {
        throw new Error(`insert_after anchor not found in ${patch.file}`);
      }
      const at = idx + change.anchor.length;
      next = `${next.slice(0, at)}${change.content}${next.slice(at)}`;
      continue;
    }

    const idx = next.indexOf(change.anchor);
    if (idx === -1) {
      throw new Error(`insert_before anchor not found in ${patch.file}`);
    }
    next = `${next.slice(0, idx)}${change.content}${next.slice(idx)}`;
  }

  return next;
}
