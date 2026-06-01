import assert from "node:assert/strict";
import { test } from "node:test";
import { INTEGRATION_IDS } from "../../../shared/integrations.ts";
import { DEFAULT_SPEECH_MODEL_ID } from "../../../shared/speechModels.ts";
import { DEFAULT_UI_THEME_ID } from "../lib/uiThemeConstants.ts";
import {
  DEFAULT_INTEGRATIONS,
  DEFAULT_USER_PREFERENCES,
  mergeUserPreferences,
  parseUserPreferences,
} from "./userPreferences.ts";

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

test("parseUserPreferences defaults integrations when missing", () => {
  const prefs = parseUserPreferences({
    ...DEFAULT_USER_PREFERENCES,
  });
  for (const id of INTEGRATION_IDS) {
    assert.equal(prefs.integrations[id]?.configured, false);
  }
});

test("parseUserPreferences reads integration flags", () => {
  const prefs = parseUserPreferences({
    ...DEFAULT_USER_PREFERENCES,
    integrations: {
      kroki: { configured: true, lastCheckedAt: "2026-01-01T00:00:00.000Z" },
      tectonic: { configured: false, lastError: "down" },
    },
  });
  assert.equal(prefs.integrations.kroki?.configured, true);
  assert.equal(prefs.integrations.kroki?.lastCheckedAt, "2026-01-01T00:00:00.000Z");
  assert.equal(prefs.integrations.tectonic?.configured, false);
  assert.equal(prefs.integrations.tectonic?.lastError, "down");
  assert.equal(prefs.integrations.plentymarkets?.configured, false);
});

test("parseUserPreferences preserves custom uiThemeId slug without embedded themes", () => {
  const prefs = parseUserPreferences({
    ...DEFAULT_USER_PREFERENCES,
    uiThemeId: "nonexistent-theme",
  });
  assert.equal(prefs.uiThemeId, "nonexistent-theme");
});

test("parseUserPreferences normalizes invalid uiThemeId slug", () => {
  const prefs = parseUserPreferences({
    ...DEFAULT_USER_PREFERENCES,
    uiThemeId: "INVALID THEME",
  });
  assert.equal(prefs.uiThemeId, DEFAULT_UI_THEME_ID);
});

test("mergeUserPreferences preserves custom uiThemeId when patching lastRoute", () => {
  const prefs = parseUserPreferences({
    ...DEFAULT_USER_PREFERENCES,
    uiThemeId: "my-custom-theme",
  });
  const merged = mergeUserPreferences(prefs, { lastRoute: "/templates" });
  assert.equal(merged.uiThemeId, "my-custom-theme");
  assert.equal(merged.lastRoute, "/templates");
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

test("parseUserPreferences defaults speechModelId when missing", () => {
  const prefs = parseUserPreferences({
    ...DEFAULT_USER_PREFERENCES,
  });
  assert.equal(prefs.speechModelId, DEFAULT_SPEECH_MODEL_ID);
});

test("parseUserPreferences normalizes unknown speechModelId", () => {
  const prefs = parseUserPreferences({
    ...DEFAULT_USER_PREFERENCES,
    speechModelId: "invalid-model",
  });
  assert.equal(prefs.speechModelId, DEFAULT_SPEECH_MODEL_ID);
});

test("parseUserPreferences keeps valid speechModelId", () => {
  const prefs = parseUserPreferences({
    ...DEFAULT_USER_PREFERENCES,
    speechModelId: "Xenova/whisper-small",
  });
  assert.equal(prefs.speechModelId, "Xenova/whisper-small");
});

test("mergeUserPreferences merges integration patches", () => {
  const merged = mergeUserPreferences(DEFAULT_USER_PREFERENCES, {
    integrations: {
      kroki: { configured: true },
    },
  });
  assert.equal(merged.integrations.kroki?.configured, true);
  assert.equal(merged.integrations.tectonic?.configured, DEFAULT_INTEGRATIONS.tectonic?.configured);
});
