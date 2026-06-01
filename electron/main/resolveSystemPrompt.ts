import type { PromptId } from "./promptRegistry.ts";
import {
  readGlobalPromptOverrides,
  readPromptOverrides,
} from "./promptOverridesIo.ts";
import { resolveSystemPromptFromSnapshots } from "./resolveSystemPromptCore.ts";
export { resolveSystemPromptFromSnapshots } from "./resolveSystemPromptCore.ts";

export type ResolveSystemPromptOptions = {
  documentId?: string;
  promptId: PromptId;
  defaultPrompt: string;
  segments?: Record<string, string>;
  placeholders?: Record<string, string | undefined>;
};

export async function resolveSystemPrompt(options: ResolveSystemPromptOptions): Promise<string> {
  const [globalSnapshot, documentSnapshot] = await Promise.all([
    readGlobalPromptOverrides(),
    options.documentId?.trim() ? readPromptOverrides(options.documentId.trim()) : Promise.resolve(undefined),
  ]);

  return resolveSystemPromptFromSnapshots({
    ...options,
    globalSnapshot,
    documentSnapshot,
  });
}
