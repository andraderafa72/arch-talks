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
import { applyPatch } from "@/lib/patchEngine";
import type { AiEditProposal, Patch } from "@/types";
import type { LocalAiSelection } from "@/types/electron-api";

export type UmlDiagramChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

type UmlDiagramChatContextValue = {
  activeFile: string;
  isChatOpen: boolean;
  chatPrompt: string;
  activeFileChat: UmlDiagramChatMessage[];
  isSending: boolean;
  streamingAssistantText: string | null;
  chatError: string | null;
  activeAiSelection: LocalAiSelection | undefined;
  setActiveAiSelection: (selection: LocalAiSelection | undefined) => void;
  setChatPrompt: (value: string) => void;
  toggleChatOpen: () => void;
  closeChat: () => void;
  sendChatMessage: (promptOverride?: string) => Promise<void>;
  clearActiveFileChat: () => void;
};

const UmlDiagramChatContext = createContext<UmlDiagramChatContextValue | null>(null);

type UmlDiagramChatProviderProps = {
  activeFile: string;
  fileContent: string;
  onPatchReceived: (proposal: AiEditProposal) => void;
  children: ReactNode;
};

function resolveElectronApi() {
  if (typeof window === "undefined") return undefined;
  if (window.electronApi) return window.electronApi;
  try {
    if (window.top && window.top !== window && window.top.electronApi) return window.top.electronApi;
  } catch {
    /* ignore cross-origin */
  }
  try {
    if (window.parent && window.parent !== window && window.parent.electronApi) return window.parent.electronApi;
  } catch {
    /* ignore cross-origin */
  }
  return undefined;
}

export function UmlDiagramChatProvider({
  activeFile,
  fileContent,
  onPatchReceived,
  children,
}: UmlDiagramChatProviderProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatByFile, setChatByFile] = useState<Record<string, UmlDiagramChatMessage[]>>({});
  const [isSending, setIsSending] = useState(false);
  const [streamingAssistantText, setStreamingAssistantText] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [activeAiSelection, setActiveAiSelection] = useState<LocalAiSelection | undefined>(undefined);
  const activeStreamIdRef = useRef<string | null>(null);

  const activeFileChat = useMemo(
    () => (activeFile ? (chatByFile[activeFile] ?? []) : []),
    [activeFile, chatByFile],
  );

  useEffect(() => {
    const api = resolveElectronApi();
    if (!api?.subscribeAiChatStream) return;
    return api.subscribeAiChatStream((payload) => {
      if (payload.streamId === activeStreamIdRef.current) {
        setStreamingAssistantText(payload.text);
      }
    });
  }, []);

  const toggleChatOpen = useCallback(() => {
    setIsChatOpen((open) => !open);
  }, []);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  const sendChatMessage = useCallback(async (promptOverride?: string): Promise<void> => {
    const trimmed = (promptOverride ?? chatPrompt).trim();
    if (!trimmed || !activeFile || isSending) return;

    const userMessage: UmlDiagramChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setChatByFile((prev) => ({
      ...prev,
      [activeFile]: [...(prev[activeFile] ?? []), userMessage],
    }));
    setChatPrompt("");
    setChatError(null);
    setIsSending(true);

    const api = resolveElectronApi();

    if (!api?.umlChatSend) {
      const errorMsg = "IA local requer o app Electron com a bridge configurada.";
      const errMessage: UmlDiagramChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: errorMsg,
        timestamp: new Date().toISOString(),
      };
      setChatByFile((prev) => ({
        ...prev,
        [activeFile]: [...(prev[activeFile] ?? []), errMessage],
      }));
      setIsSending(false);
      return;
    }

    const snapshotFile = activeFile;
    const snapshotContent = fileContent;
    const sessionKey = `uml-render:${snapshotFile}`;
    const streamId = crypto.randomUUID();
    activeStreamIdRef.current = streamId;
    setStreamingAssistantText("");

    try {
      const response = await api.umlChatSend({
        sessionKey,
        activeFile: snapshotFile,
        fileContent: snapshotContent,
        prompt: trimmed,
        aiSelection: activeAiSelection,
        streamId,
      });
      activeStreamIdRef.current = null;
      setStreamingAssistantText(null);
      const assistantMessage: UmlDiagramChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.reply || "(sem resposta)",
        timestamp: new Date().toISOString(),
      };
      setChatByFile((prev) => ({
        ...prev,
        [snapshotFile]: [...(prev[snapshotFile] ?? []), assistantMessage],
      }));
      if (response.patch) {
        try {
          const patch = response.patch as Patch;
          const proposedContent = applyPatch(snapshotContent, patch);
          const proposal: AiEditProposal = {
            id: crypto.randomUUID(),
            file: snapshotFile,
            originalContent: snapshotContent,
            patch,
            proposedContent,
            timestamp: new Date().toISOString(),
          };
          onPatchReceived(proposal);
        } catch (patchError) {
          const patchErrMsg =
            patchError instanceof Error
              ? `Patch inválido: ${patchError.message}`
              : "Patch inválido: erro desconhecido.";
          setChatError(patchErrMsg);
        }
      }
    } catch (err: unknown) {
      activeStreamIdRef.current = null;
      setStreamingAssistantText(null);
      const msg = err instanceof Error ? err.message : "Erro ao contatar IA local.";
      setChatError(msg);
      const errMessage: UmlDiagramChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Erro: ${msg}`,
        timestamp: new Date().toISOString(),
      };
      setChatByFile((prev) => ({
        ...prev,
        [snapshotFile]: [...(prev[snapshotFile] ?? []), errMessage],
      }));
    } finally {
      setIsSending(false);
    }
  }, [activeFile, fileContent, chatPrompt, isSending, onPatchReceived, activeAiSelection]);

  const clearActiveFileChat = useCallback(() => {
    if (!activeFile) return;
    setChatByFile((prev) => {
      if (!Object.hasOwn(prev, activeFile)) return prev;
      const next = { ...prev };
      delete next[activeFile];
      return next;
    });
    setChatError(null);
    activeStreamIdRef.current = null;
    setStreamingAssistantText(null);
  }, [activeFile]);

  useEffect(() => {
    if (!isChatOpen) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeChat();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [closeChat, isChatOpen]);

  const value = useMemo<UmlDiagramChatContextValue>(
    () => ({
      activeFile,
      isChatOpen,
      chatPrompt,
      activeFileChat,
      isSending,
      streamingAssistantText,
      chatError,
      activeAiSelection,
      setActiveAiSelection,
      setChatPrompt,
      toggleChatOpen,
      closeChat,
      sendChatMessage,
      clearActiveFileChat,
    }),
    [
      activeFile,
      isChatOpen,
      chatPrompt,
      activeFileChat,
      isSending,
      streamingAssistantText,
      chatError,
      activeAiSelection,
      toggleChatOpen,
      closeChat,
      sendChatMessage,
      clearActiveFileChat,
    ],
  );

  return <UmlDiagramChatContext.Provider value={value}>{children}</UmlDiagramChatContext.Provider>;
}

export function useUmlDiagramChatContext() {
  const value = useContext(UmlDiagramChatContext);
  if (!value) {
    throw new Error("useUmlDiagramChatContext must be used within UmlDiagramChatProvider");
  }
  return value;
}
