/** Shared mention token extraction for main process (mirrors renderer mentionTokens.ts). */
export const MENTION_TOKEN_REGEX = /@(?:ws|ref):[^\s]+/g;

export function extractMentionTokensFromText(text: string): string[] {
  return [...text.matchAll(MENTION_TOKEN_REGEX)].map((m) => m[0]);
}
