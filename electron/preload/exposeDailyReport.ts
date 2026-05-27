import { ipcRenderer } from "electron";
import type {
  DailyReportChatRequest,
  DailyReportChatResponse,
  DailyReportDocument,
  DailyReportMonthDayIndex,
  DailyReportStorageRootInfo,
  DailyReportTaxonomy,
} from "../../src/renderer/types/daily-report.ts";

export function exposeDailyReportApis() {
  return {
    dailyReportLoadTaxonomy: (): Promise<DailyReportTaxonomy> =>
      ipcRenderer.invoke("dailyReport:loadTaxonomy"),
    dailyReportSaveTaxonomy: (taxonomy: DailyReportTaxonomy): Promise<{ ok: true }> =>
      ipcRenderer.invoke("dailyReport:saveTaxonomy", taxonomy),
    dailyReportGetStorageRoot: (): Promise<DailyReportStorageRootInfo> =>
      ipcRenderer.invoke("dailyReport:getStorageRoot"),
    dailyReportSetStorageRoot: (
      storageRootPath: string | null,
    ): Promise<DailyReportStorageRootInfo> =>
      ipcRenderer.invoke("dailyReport:setStorageRoot", { storageRootPath }),
    dailyReportPickStorageRoot: (): Promise<
      | ({ ok: true } & DailyReportStorageRootInfo)
      | { ok: false; canceled: true }
    > => ipcRenderer.invoke("dailyReport:pickStorageRoot"),
    dailyReportListMonth: (year: number, month: number): Promise<DailyReportMonthDayIndex[]> =>
      ipcRenderer.invoke("dailyReport:listMonth", { year, month }),
    dailyReportLoad: (date: string): Promise<DailyReportDocument> =>
      ipcRenderer.invoke("dailyReport:load", { date }),
    dailyReportSave: (document: DailyReportDocument): Promise<{ ok: true }> =>
      ipcRenderer.invoke("dailyReport:save", { document }),
    dailyReportChatSend: (req: DailyReportChatRequest): Promise<DailyReportChatResponse> =>
      ipcRenderer.invoke("dailyReportChat:send", req),
  };
}
