import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_UI_THEME_ID } from "../lib/uiThemeConstants.ts";
import { DEFAULT_USER_PREFERENCES, mergeUserPreferences, parseUserPreferences } from "./userPreferences.ts";

test("parseUserPreferences defaults uiThemeId and customUiThemes when missing", () => {
  const legacy = parseUserPreferences({
    version: 1,
    theme: "dark",
    locale: "en",
    lastRoute: "/workspace",
    activeConversationId: "abc",
    workspaceLayout: DEFAULT_USER_PREFERENCES.workspaceLayout,
  });
  assert.equal(legacy.uiThemeId, DEFAULT_UI_THEME_ID);
  assert.deepEqual(legacy.customUiThemes, []);
});

test("parseUserPreferences normalizes unknown uiThemeId", () => {
  const prefs = parseUserPreferences({
    ...DEFAULT_USER_PREFERENCES,
    uiThemeId: "nonexistent-theme",
  });
  assert.equal(prefs.uiThemeId, DEFAULT_UI_THEME_ID);
});

test("parseUserPreferences keeps built-in orange uiThemeId", () => {
  const prefs = parseUserPreferences({
    ...DEFAULT_USER_PREFERENCES,
    uiThemeId: "orange",
  });
  assert.equal(prefs.uiThemeId, "orange");
});

test("mergeUserPreferences keeps uiThemeId when patching unrelated fields", () => {
  const prefs = parseUserPreferences({
    ...DEFAULT_USER_PREFERENCES,
    theme: "dark",
    uiThemeId: "orange",
    activeConversationId: "conv-a",
  });
  const merged = mergeUserPreferences(prefs, { activeConversationId: "conv-b" });
  assert.equal(merged.uiThemeId, "orange");
  assert.equal(merged.activeConversationId, "conv-b");
});
