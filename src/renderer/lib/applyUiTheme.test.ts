import assert from "node:assert/strict";
import { test } from "node:test";
import defaultPreset from "../themes/presets/default.json";
import { applyUiThemePalette } from "./applyUiTheme.ts";
import { parseUiTheme } from "../types/uiTheme.ts";

test("applyUiThemePalette sets CSS variables on document root", () => {
  const vars = new Map<string, string>();
  const mockRoot = {
    style: {
      setProperty: (name: string, value: string) => {
        vars.set(name, value);
      },
      getPropertyValue: (name: string) => vars.get(name) ?? "",
    },
  };
  (globalThis as { document?: { documentElement: typeof mockRoot } }).document = {
    documentElement: mockRoot,
  };

  const parsed = parseUiTheme(defaultPreset);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  applyUiThemePalette(parsed.theme.light);

  assert.equal(vars.get("--ui-shell-bg"), "#fefefe");
  assert.equal(vars.get("--ui-sidebar-bg"), "#ececee");
  assert.equal(vars.get("--ui-md-pdf-bg"), "#fefefe");
  assert.equal(vars.get("--ui-config-bg"), "#fefefe");
  assert.ok(vars.get("--ui-font-family")?.includes("Inter"));

  delete (globalThis as { document?: unknown }).document;
});
