import assert from "node:assert/strict";
import { test } from "node:test";
import defaultPreset from "../themes/presets/default.json";
import { isValidHexColor, parseUiTheme, duplicateUiTheme } from "./uiTheme.ts";

test("isValidHexColor accepts 3 and 6 digit hex", () => {
  assert.equal(isValidHexColor("#fff"), true);
  assert.equal(isValidHexColor("#fefefe"), true);
  assert.equal(isValidHexColor("fefefe"), false);
  assert.equal(isValidHexColor("#gggggg"), false);
});

test("parseUiTheme accepts bundled default preset", () => {
  const result = parseUiTheme(defaultPreset);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.theme.id, "default");
    assert.equal(result.theme.version, 1);
    assert.equal(result.theme.light.shell.background, "#fefefe");
    assert.equal(result.theme.dark.shell.background, "#0b0e14");
  }
});

test("parseUiTheme rejects invalid version and colors", () => {
  const badVersion = parseUiTheme({ ...defaultPreset, version: 2 });
  assert.equal(badVersion.ok, false);

  const badColor = parseUiTheme({
    ...defaultPreset,
    light: { ...(defaultPreset as { light: object }).light, shell: { background: "red", foreground: "#111827" } },
  });
  assert.equal(badColor.ok, false);
});

test("duplicateUiTheme copies palettes with new id", () => {
  const result = parseUiTheme(defaultPreset);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const copy = duplicateUiTheme(result.theme, "my-theme", "My Theme");
  assert.equal(copy.id, "my-theme");
  assert.equal(copy.name, "My Theme");
  assert.equal(copy.builtIn, false);
  assert.equal(copy.light.shell.background, result.theme.light.shell.background);
});
