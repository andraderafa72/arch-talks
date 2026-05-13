import type { KeyboardEvent } from "react";

/**
 * Port of `frontend/chatTextarea.js` — same Enter / newline rules and auto height.
 */
export function adjustChatTextareaHeight(
  element: HTMLTextAreaElement | null,
  minRows: number,
  maxRows: number,
): number {
  if (!element) return minRows;

  element.style.height = "auto";

  const computedStyle = window.getComputedStyle(element);
  const lineHeight = Number.parseInt(computedStyle.lineHeight, 10) || 20;
  const paddingTop = Number.parseInt(computedStyle.paddingTop, 10) || 0;
  const paddingBottom = Number.parseInt(computedStyle.paddingBottom, 10) || 0;

  const contentHeight = element.scrollHeight - paddingTop - paddingBottom;
  const requiredRows = Math.max(minRows, Math.ceil(contentHeight / lineHeight));
  const actualRows = Math.min(requiredRows, maxRows);

  const newHeight = actualRows * lineHeight + paddingTop + paddingBottom;
  element.style.height = `${newHeight}px`;

  if (requiredRows > maxRows) {
    element.style.overflowY = "auto";
  } else {
    element.style.overflowY = "hidden";
  }

  return actualRows;
}

export type ChatTextareaKeydownOptions = {
  onSubmit: (value: string) => void;
};

/**
 * Same logic as `window.chatTextarea.initialize` keydown handler:
 * - Enter + Shift: do nothing (default = newline).
 * - Enter when value already contains `\n`: do nothing (default = another newline).
 * - Enter when value has no `\n`: prevent default and submit.
 */
export function handleChatTextareaKeyDown(
  event: KeyboardEvent<HTMLTextAreaElement>,
  options: ChatTextareaKeydownOptions,
): void {
  if (event.key !== "Enter") return;
  if (event.shiftKey) return;

  const value = event.currentTarget.value;
  if (value.indexOf("\n") !== -1) return;

  event.preventDefault();
  options.onSubmit(value);
}
