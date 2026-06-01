import assert from "node:assert/strict";
import test from "node:test";
import { getEffectiveScanFolderPath } from "./systemDesignFolders.ts";
import type { Conversation } from "@/types";

function systemDesignConversation(
  overrides: Partial<Conversation> = {},
): Conversation {
  return {
    id: "id",
    title: "t",
    kind: "system_design",
    createdAt: "",
    updatedAt: "",
    templateId: null,
    files: {},
    activeFile: "diagrams/block.puml",
    openEditorTabs: [],
    pendingPatch: null,
    history: [],
    chatTabs: [],
    openChatTabIds: [],
    activeChatTabId: "tab",
    chatMessages: [],
    savedSnapshot: {},
    ...overrides,
  };
}

test("getEffectiveScanFolderPath returns undefined without explicit selection", () => {
  assert.equal(
    getEffectiveScanFolderPath(
      systemDesignConversation({ scanFolderPath: "/proj", scanFolderExplicit: false }),
    ),
    undefined,
  );
  assert.equal(
    getEffectiveScanFolderPath(systemDesignConversation({ scanFolderPath: "/proj" })),
    undefined,
  );
});

test("getEffectiveScanFolderPath returns path when explicitly selected", () => {
  assert.equal(
    getEffectiveScanFolderPath(
      systemDesignConversation({ scanFolderPath: "/code", scanFolderExplicit: true }),
    ),
    "/code",
  );
});

test("getEffectiveScanFolderPath treats legacy scan matching project root as implicit", () => {
  assert.equal(
    getEffectiveScanFolderPath(
      systemDesignConversation({
        scanFolderPath: "/proj",
        systemDesignRootPath: "/proj",
        scanFolderExplicit: false,
      }),
    ),
    undefined,
  );
});

test("getEffectiveScanFolderPath keeps legacy scan when different from project root", () => {
  assert.equal(
    getEffectiveScanFolderPath(
      systemDesignConversation({
        scanFolderPath: "/codebase",
        systemDesignRootPath: "/proj",
        scanFolderExplicit: false,
      }),
    ),
    "/codebase",
  );
});
