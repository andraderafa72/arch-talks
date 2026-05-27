/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isAbortError, stoppedAssistantContent } from "@/lib/localAiErrors";
import { useEditorStore } from "@/state/store";
import type {
  DailyReportBlockSpec,
  DailyReportChatTab,
  DailyReportChatTurn,
  DailyReportDocument,
  DailyReportMonthDayIndex,
  DailyReportStorageRootInfo,
  DailyReportSummary,
  DailyReportTaskEntry,
  DailyReportTaxonomy,
} from "@/types/daily-report";
import { todayIsoDate } from "@/types/daily-report";
import type { LocalAiSelection } from "@/types/electron-api";

const SAVE_DEBOUNCE_MS = 400;

function resolveElectronApi() {
  return typeof window !== "undefined" ? window.electronApi : undefined;
}

function withActiveChatTabId(
  doc: DailyReportDocument,
  activeChatTabId: string,
): DailyReportDocument {
  const tabId =
    activeChatTabId && doc.chatTabs.some((t) => t.id === activeChatTabId)
      ? activeChatTabId
      : doc.chatTabs[0]?.id;
  return {
    ...doc,
    updatedAt: new Date().toISOString(),
    activeChatTabId: tabId || undefined,
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        t = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (t) clearTimeout(t);
  }
}

type DailyReportContextValue = {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  calendarYear: number;
  calendarMonth: number;
  setCalendarMonth: (year: number, month: number) => void;
  monthIndex: DailyReportMonthDayIndex[];
  document: DailyReportDocument | null;
  taxonomy: DailyReportTaxonomy | null;
  storageInfo: DailyReportStorageRootInfo | null;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  isSending: boolean;
  streamingAssistantText: string | null;
  streamingStreamId: string | null;
  activeAiSelection: LocalAiSelection | undefined;
  setActiveAiSelection: (selection: LocalAiSelection | undefined) => void;
  error: string | null;
  view: "report" | "settings";
  setView: (view: "report" | "settings") => void;
  updateEntries: (entries: DailyReportTaskEntry[]) => void;
  updateNarrative: (narrative: string | undefined) => void;
  addEntry: () => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, patch: Partial<DailyReportTaskEntry>) => void;
  setTaskBlockPlan: (plan: DailyReportBlockSpec[] | undefined) => void;
  activeChatTabId: string;
  setActiveChatTabId: (tabId: string) => void;
  addChatTab: () => void;
  clearActiveChatTab: () => void;
  isBlockPlanValid: boolean;
  setBlockPlanValid: (valid: boolean) => void;
  sendChatMessage: (prompt: string) => Promise<void>;
  stopChatMessage: () => Promise<void>;
  refreshMonthIndex: () => Promise<void>;
  reloadTaxonomy: () => Promise<void>;
  saveTaxonomy: (taxonomy: DailyReportTaxonomy) => Promise<void>;
  pickStorageRoot: () => Promise<void>;
  resetStorageRoot: () => Promise<void>;
};

const DailyReportContext = createContext<DailyReportContextValue | null>(null);

function summaryToEntries(summary: DailyReportSummary): DailyReportTaskEntry[] {
  return summary.entries.map((e) => ({
    id: crypto.randomUUID(),
    hours: e.hours,
    description: e.description,
    categoryId: e.categoryId,
    taskTypeId: e.taskTypeId,
  }));
}

type DailyReportProviderProps = {
  children: ReactNode;
};

export function DailyReportProvider({ children }: DailyReportProviderProps) {
  const locale = useEditorStore((s) => s.locale);
  const today = todayIsoDate();
  const [selectedDate, setSelectedDateState] = useState(today);
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonthState] = useState(() => new Date().getMonth() + 1);
  const [monthIndex, setMonthIndex] = useState<DailyReportMonthDayIndex[]>([]);
  const [document, setDocument] = useState<DailyReportDocument | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");
  const [taxonomy, setTaxonomy] = useState<DailyReportTaxonomy | null>(null);
  const [storageInfo, setStorageInfo] = useState<DailyReportStorageRootInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [streamingAssistantText, setStreamingAssistantText] = useState<string | null>(null);
  const [streamingStreamId, setStreamingStreamId] = useState<string | null>(null);
  const streamingTextRef = useRef("");
  const activeStreamIdRef = useRef<string | null>(null);
  const [activeAiSelection, setActiveAiSelection] = useState<LocalAiSelection | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"report" | "settings">("report");
  const [isBlockPlanValid, setBlockPlanValid] = useState(true);
  const [activeChatTabId, setActiveChatTabIdState] = useState("");
  const documentRef = useRef<DailyReportDocument | null>(null);
  const savedSnapshotRef = useRef("");
  const activeChatTabIdRef = useRef("");
  const isLoadingRef = useRef(isLoading);
  const isSendingRef = useRef(isSending);

  documentRef.current = document;
  savedSnapshotRef.current = savedSnapshot;
  activeChatTabIdRef.current = activeChatTabId;
  isLoadingRef.current = isLoading;
  isSendingRef.current = isSending;

  const setActiveChatTabId = useCallback((tabId: string) => {
    setActiveChatTabIdState(tabId);
    setDocument((prev) => (prev ? { ...prev, activeChatTabId: tabId } : prev));
  }, []);

  const ensureActiveChatTabId = useCallback((doc: DailyReportDocument) => {
    setActiveChatTabIdState((current) => {
      if (doc.activeChatTabId && doc.chatTabs.some((t) => t.id === doc.activeChatTabId)) {
        return doc.activeChatTabId;
      }
      const firstId = doc.chatTabs[0]?.id ?? "";
      if (current && doc.chatTabs.some((t) => t.id === current)) return current;
      return firstId;
    });
  }, []);

  const isDirty = useMemo(() => {
    if (!document) return false;
    return JSON.stringify(document) !== savedSnapshot;
  }, [document, savedSnapshot]);

  const setCalendarMonth = useCallback((year: number, month: number) => {
    setCalendarYear(year);
    setCalendarMonthState(month);
  }, []);

  const refreshMonthIndex = useCallback(async () => {
    const api = resolveElectronApi();
    if (!api?.dailyReportListMonth) return;
    const days = await api.dailyReportListMonth(calendarYear, calendarMonth);
    setMonthIndex(days);
  }, [calendarYear, calendarMonth]);

  const persistDocument = useCallback(
    async (docOverride?: DailyReportDocument): Promise<boolean> => {
      const api = resolveElectronApi();
      const base = docOverride ?? documentRef.current;
      if (!api?.dailyReportSave || !base || isLoadingRef.current) return false;

      const toSave = withActiveChatTabId(base, activeChatTabIdRef.current);
      setIsSaving(true);
      setError(null);
      try {
        await api.dailyReportSave(toSave);
        setSavedSnapshot(JSON.stringify(toSave));
        setDocument((prev) => (prev?.date === toSave.date ? toSave : prev));
        await refreshMonthIndex();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [refreshMonthIndex],
  );

  const setSelectedDate = useCallback(
    (date: string) => {
      if (date === selectedDate) return;
      const docToFlush = documentRef.current;
      const snapshot = savedSnapshotRef.current;
      const leavingDate = selectedDate;
      void (async () => {
        if (
          docToFlush &&
          docToFlush.date === leavingDate &&
          JSON.stringify(docToFlush) !== snapshot
        ) {
          await persistDocument(docToFlush);
        }
        setSelectedDateState(date);
      })();
    },
    [selectedDate, persistDocument],
  );

  const reloadTaxonomy = useCallback(async () => {
    const api = resolveElectronApi();
    if (!api?.dailyReportLoadTaxonomy) return;
    const tax = await api.dailyReportLoadTaxonomy();
    setTaxonomy(tax);
  }, []);

  const loadReportForDate = useCallback(async (date: string) => {
    const api = resolveElectronApi();
    if (!api?.dailyReportLoad) {
      setError("Electron API unavailable");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const doc = await withTimeout(
        api.dailyReportLoad(date),
        8000,
        "Daily report load timed out. Check Electron main process logs for IPC errors.",
      );
      setDocument(doc);
      ensureActiveChatTabId(doc);
      setSavedSnapshot(JSON.stringify(doc));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  }, [ensureActiveChatTabId]);

  useEffect(() => {
    const api = resolveElectronApi();
    if (!api) {
      setIsLoading(false);
      return;
    }
    void (async () => {
      try {
        if (api.dailyReportGetStorageRoot) {
          setStorageInfo(await api.dailyReportGetStorageRoot());
        }
        await reloadTaxonomy();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize");
      }
    })();
  }, [reloadTaxonomy]);

  useEffect(() => {
    void loadReportForDate(selectedDate);
  }, [selectedDate, loadReportForDate]);

  useEffect(() => {
    void refreshMonthIndex();
  }, [refreshMonthIndex]);

  useEffect(() => {
    const api = resolveElectronApi();
    if (!api?.subscribeAiChatStream) return;
    return api.subscribeAiChatStream((payload) => {
      if (payload.streamId === activeStreamIdRef.current) {
        streamingTextRef.current = payload.text;
        setStreamingAssistantText(payload.text);
      }
    });
  }, []);

  const updateEntries = useCallback((entries: DailyReportTaskEntry[]) => {
    setDocument((prev) => (prev ? { ...prev, entries } : prev));
  }, []);

  const updateNarrative = useCallback((narrative: string | undefined) => {
    setDocument((prev) => (prev ? { ...prev, narrative } : prev));
  }, []);

  const addEntry = useCallback(() => {
    const firstCategory = taxonomy?.categories[0]?.id ?? "";
    const firstType = taxonomy?.taskTypes.find((t) => t.categoryId === firstCategory)?.id ?? "";
    setDocument((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        entries: [
          ...prev.entries,
          {
            id: crypto.randomUUID(),
            hours: 1,
            description: "",
            categoryId: firstCategory,
            taskTypeId: firstType,
          },
        ],
      };
    });
  }, [taxonomy]);

  const removeEntry = useCallback((id: string) => {
    setDocument((prev) =>
      prev ? { ...prev, entries: prev.entries.filter((e) => e.id !== id) } : prev,
    );
  }, []);

  const updateEntry = useCallback((id: string, patch: Partial<DailyReportTaskEntry>) => {
    setDocument((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        entries: prev.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      };
    });
  }, []);

  const setTaskBlockPlan = useCallback((plan: DailyReportBlockSpec[] | undefined) => {
    setDocument((prev) => (prev ? { ...prev, taskBlockPlan: plan } : prev));
  }, []);

  const addChatTab = useCallback(() => {
    setDocument((prev) => {
      if (!prev) return prev;
      const nextIndex = prev.chatTabs.length + 1;
      const tab: DailyReportChatTab = {
        id: crypto.randomUUID(),
        title: `Chat ${nextIndex}`,
        messages: [],
      };
      setActiveChatTabIdState(tab.id);
      return { ...prev, chatTabs: [...prev.chatTabs, tab], activeChatTabId: tab.id };
    });
  }, []);

  const clearActiveChatTab = useCallback(() => {
    setDocument((prev) => {
      if (!prev || !activeChatTabId) return prev;
      return {
        ...prev,
        chatTabs: prev.chatTabs.map((tab) => (tab.id === activeChatTabId ? { ...tab, messages: [] } : tab)),
      };
    });
  }, [activeChatTabId]);

  const appendChatTurn = useCallback(
    (turn: DailyReportChatTurn) => {
      setDocument((prev) => {
        if (!prev) return prev;
        const tabId = activeChatTabId || prev.chatTabs[0]?.id;
        if (!tabId) return prev;
        return {
          ...prev,
          chatTabs: prev.chatTabs.map((tab) =>
            tab.id === tabId ? { ...tab, messages: [...tab.messages, turn] } : tab,
          ),
        };
      });
    },
    [activeChatTabId],
  );

  useEffect(() => {
    if (!isDirty || isLoading || isSending) return;
    const timer = window.setTimeout(() => {
      void persistDocument();
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [document, savedSnapshot, isDirty, isLoading, isSending, persistDocument]);

  useEffect(() => {
    const onBeforeUnload = () => {
      const doc = documentRef.current;
      if (doc && JSON.stringify(doc) !== savedSnapshotRef.current) {
        void persistDocument(doc);
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [persistDocument]);

  const sendChatMessage = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || isSending || !document || !isBlockPlanValid) return;

      const api = resolveElectronApi();
      if (!api?.dailyReportChatSend) {
        setError("Electron API unavailable");
        return;
      }

      const userTurn: DailyReportChatTurn = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
      };
      appendChatTurn(userTurn);
      setIsSending(true);
      setError(null);

      const tabId = activeChatTabId || document.chatTabs[0]?.id || "chat";
      const sessionKey = `daily-report:${selectedDate}:${tabId}`;
      const streamId = crypto.randomUUID();
      activeStreamIdRef.current = streamId;
      setStreamingStreamId(streamId);
      streamingTextRef.current = "";
      setStreamingAssistantText("");

      try {
        const plan = document.taskBlockPlan ?? [];
        const tab = document.chatTabs.find((t) => t.id === tabId);
        const priorMessages = tab?.messages ?? [];
        const response = await api.dailyReportChatSend({
          sessionKey,
          date: selectedDate,
          prompt: trimmed,
          taskBlockPlan: plan.length > 0 ? plan : undefined,
          messages: priorMessages,
          currentEntries: document.entries,
          aiSelection: activeAiSelection,
          streamId,
        });

        activeStreamIdRef.current = null;
        setStreamingStreamId(null);
        streamingTextRef.current = "";
        setStreamingAssistantText(null);

        const assistantTurn: DailyReportChatTurn = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.reply || "(no response)",
          timestamp: new Date().toISOString(),
        };
        appendChatTurn(assistantTurn);

        if (response.parseError) {
          appendChatTurn({
            id: crypto.randomUUID(),
            role: "system",
            content: response.parseError,
            timestamp: new Date().toISOString(),
          });
        }

        if (response.summary) {
          setDocument((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              narrative: response.summary?.narrative ?? prev.narrative,
              entries: summaryToEntries(response.summary!),
            };
          });
        }
      } catch (err) {
        activeStreamIdRef.current = null;
        setStreamingStreamId(null);
        const partial = streamingTextRef.current;
        streamingTextRef.current = "";
        setStreamingAssistantText(null);

        if (isAbortError(err)) {
          const stopped = stoppedAssistantContent(partial, locale);
          if (stopped) {
            appendChatTurn({
              id: crypto.randomUUID(),
              role: "assistant",
              content: stopped,
              timestamp: new Date().toISOString(),
            });
          }
          return;
        }
        const msg = err instanceof Error ? err.message : "AI request failed";
        setError(msg);
        appendChatTurn({
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Error: ${msg}`,
          timestamp: new Date().toISOString(),
        });
      } finally {
        setIsSending(false);
      }
    },
    [
      activeAiSelection,
      activeChatTabId,
      appendChatTurn,
      document,
      isBlockPlanValid,
      isSending,
      locale,
      selectedDate,
    ],
  );

  const stopChatMessage = useCallback(async () => {
    const api = resolveElectronApi();
    if (!api?.aiChatCancel) return;
    const tabId = activeChatTabId || document?.chatTabs[0]?.id || "chat";
    await api.aiChatCancel(`daily-report:${selectedDate}:${tabId}`);
  }, [activeChatTabId, document?.chatTabs, selectedDate]);

  const saveTaxonomy = useCallback(
    async (next: DailyReportTaxonomy) => {
      const api = resolveElectronApi();
      if (!api?.dailyReportSaveTaxonomy) return;
      await api.dailyReportSaveTaxonomy(next);
      setTaxonomy(next);
    },
    [],
  );

  const pickStorageRoot = useCallback(async () => {
    const api = resolveElectronApi();
    if (!api?.dailyReportPickStorageRoot) return;
    const result = await api.dailyReportPickStorageRoot();
    if (result.ok) {
      setStorageInfo({
        storageRoot: result.storageRoot,
        customPath: result.customPath,
        defaultPath: result.defaultPath,
      });
      await refreshMonthIndex();
      await loadReportForDate(selectedDate);
    }
  }, [loadReportForDate, refreshMonthIndex, selectedDate]);

  const resetStorageRoot = useCallback(async () => {
    const api = resolveElectronApi();
    if (!api?.dailyReportSetStorageRoot) return;
    const info = await api.dailyReportSetStorageRoot(null);
    setStorageInfo(info);
    await refreshMonthIndex();
    await loadReportForDate(selectedDate);
  }, [loadReportForDate, refreshMonthIndex, selectedDate]);

  const value = useMemo<DailyReportContextValue>(
    () => ({
      selectedDate,
      setSelectedDate,
      calendarYear,
      calendarMonth,
      setCalendarMonth,
      monthIndex,
      document,
      taxonomy,
      storageInfo,
      isLoading,
      isSaving,
      isDirty,
      isSending,
      streamingAssistantText,
      streamingStreamId,
      activeAiSelection,
      setActiveAiSelection,
      error,
      view,
      setView,
      updateEntries,
      updateNarrative,
      addEntry,
      removeEntry,
      updateEntry,
      setTaskBlockPlan,
      activeChatTabId,
      setActiveChatTabId,
      addChatTab,
      clearActiveChatTab,
      isBlockPlanValid,
      setBlockPlanValid,
      sendChatMessage,
      stopChatMessage,
      refreshMonthIndex,
      reloadTaxonomy,
      saveTaxonomy,
      pickStorageRoot,
      resetStorageRoot,
    }),
    [
      selectedDate,
      setSelectedDate,
      calendarYear,
      calendarMonth,
      setCalendarMonth,
      monthIndex,
      document,
      taxonomy,
      storageInfo,
      isLoading,
      isSaving,
      isDirty,
      isSending,
      streamingAssistantText,
      streamingStreamId,
      activeAiSelection,
      error,
      view,
      updateEntries,
      updateNarrative,
      addEntry,
      removeEntry,
      updateEntry,
      setTaskBlockPlan,
      activeChatTabId,
      setActiveChatTabId,
      addChatTab,
      clearActiveChatTab,
      isBlockPlanValid,
      setBlockPlanValid,
      sendChatMessage,
      stopChatMessage,
      refreshMonthIndex,
      reloadTaxonomy,
      saveTaxonomy,
      pickStorageRoot,
      resetStorageRoot,
    ],
  );

  return <DailyReportContext.Provider value={value}>{children}</DailyReportContext.Provider>;
}

export function useDailyReportContext() {
  const ctx = useContext(DailyReportContext);
  if (!ctx) throw new Error("useDailyReportContext must be used within DailyReportProvider");
  return ctx;
}
