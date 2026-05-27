import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readDailyReport, resolveReportFilePath, writeDailyReport } from "./dailyReportIo.ts";
import type { DailyReportDocument } from "./dailyReportTypes.ts";

describe("dailyReportIo", () => {
  it("writes under storageRoot/year/month/date.json and round-trips full document", async () => {
    const storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "daily-report-io-"));
    const date = "2026-05-25";
    const doc: DailyReportDocument = {
      version: 1,
      date,
      narrative: "Shipped feature X",
      taskBlockPlan: [
        { hours: 2, count: 1 },
        { hours: 1, count: 2 },
      ],
      entries: [
        {
          id: "entry-1",
          hours: 2,
          description: "Feature work",
          categoryId: "development",
          taskTypeId: "feature-work",
        },
      ],
      chatTabs: [
        {
          id: "tab-a",
          title: "Morning",
          messages: [
            {
              id: "msg-1",
              role: "user",
              content: "Worked on API",
              timestamp: "2026-05-25T09:00:00.000Z",
            },
            {
              id: "msg-2",
              role: "assistant",
              content: "Noted.",
              timestamp: "2026-05-25T09:01:00.000Z",
            },
          ],
        },
        {
          id: "tab-b",
          title: "Afternoon",
          messages: [],
        },
      ],
      activeChatTabId: "tab-a",
      createdAt: "2026-05-25T08:00:00.000Z",
      updatedAt: "2026-05-25T08:00:00.000Z",
    };

    const expectedPath = path.join(storageRoot, "2026", "05", "2026-05-25.json");
    assert.equal(resolveReportFilePath(storageRoot, date), expectedPath);

    await writeDailyReport(storageRoot, doc);
    assert.equal(await fs.stat(expectedPath).then(() => true), true);

    const loaded = await readDailyReport(storageRoot, date);
    assert.ok(loaded);
    assert.equal(loaded.date, date);
    assert.equal(loaded.narrative, doc.narrative);
    assert.deepEqual(loaded.taskBlockPlan, doc.taskBlockPlan);
    assert.equal(loaded.entries.length, 1);
    assert.equal(loaded.entries[0]?.description, "Feature work");
    assert.equal(loaded.chatTabs.length, 2);
    assert.equal(loaded.chatTabs[0]?.id, "tab-a");
    assert.equal(loaded.chatTabs[0]?.messages.length, 2);
    assert.equal(loaded.activeChatTabId, "tab-a");
    assert.ok(loaded.updatedAt >= doc.updatedAt);
  });
});
