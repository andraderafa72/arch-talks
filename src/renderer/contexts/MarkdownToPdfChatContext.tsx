/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { applyPatch } from "@/lib/patchEngine";
import type { AiEditProposal, Patch } from "@/types";
import type { LocalAiSelection } from "@/types/electron-api";

export type MarkdownToPdfChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

type MarkdownToPdfChatContextValue = {
  activeFile: string;
  isChatOpen: boolean;
  chatPrompt: string;
  activeFileChat: MarkdownToPdfChatMessage[];
  isSending: boolean;
  chatError: string | null;
  activeAiSelection: LocalAiSelection | undefined;
  setActiveAiSelection: (selection: LocalAiSelection | undefined) => void;
  setChatPrompt: (value: string) => void;
  toggleChatOpen: () => void;
  closeChat: () => void;
  sendChatMessage: (promptOverride?: string) => Promise<void>;
  clearActiveFileChat: () => void;
};

const MarkdownToPdfChatContext = createContext<MarkdownToPdfChatContextValue | null>(null);

type MarkdownToPdfChatProviderProps = {
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

export function MarkdownToPdfChatProvider({
  activeFile,
  fileContent,
  onPatchReceived,
  children,
}: MarkdownToPdfChatProviderProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatByFile, setChatByFile] = useState<Record<string, MarkdownToPdfChatMessage[]>>({});
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [activeAiSelection, setActiveAiSelection] = useState<LocalAiSelection | undefined>(undefined);

  const activeFileChat = useMemo(
    () => (activeFile ? (chatByFile[activeFile] ?? []) : []),
    [activeFile, chatByFile],
  );

  const toggleChatOpen = useCallback(() => {
    setIsChatOpen((open) => !open);
  }, []);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  const sendChatMessage = useCallback(async (promptOverride?: string): Promise<void> => {
    const trimmed = (promptOverride ?? chatPrompt).trim();
    if (!trimmed || !activeFile || isSending) return;

    const userMessage: MarkdownToPdfChatMessage = {
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

    if (!api?.markdownChatSend) {
      const errorMsg = "IA local requer o app Electron com a bridge configurada.";
      const errMessage: MarkdownToPdfChatMessage = {
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
    const sessionKey = `markdown-to-pdf:${snapshotFile}`;

    try {
      const response = await api.markdownChatSend({
        sessionKey,
        activeFile: snapshotFile,
        fileContent: snapshotContent,
        prompt: trimmed,
        aiSelection: activeAiSelection,
      });
      const assistantMessage: MarkdownToPdfChatMessage = {
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
      const msg = err instanceof Error ? err.message : "Erro ao contatar IA local.";
      setChatError(msg);
      const errMessage: MarkdownToPdfChatMessage = {
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
  }, [activeFile]);

  useEffect(() => {
    if (!isChatOpen) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeChat();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [closeChat, isChatOpen]);

  const value = useMemo<MarkdownToPdfChatContextValue>(
    () => ({
      activeFile,
      isChatOpen,
      chatPrompt,
      activeFileChat,
      isSending,
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
      chatError,
      activeAiSelection,
      toggleChatOpen,
      closeChat,
      sendChatMessage,
      clearActiveFileChat,
    ],
  );

  return <MarkdownToPdfChatContext.Provider value={value}>{children}</MarkdownToPdfChatContext.Provider>;
}

export function useMarkdownToPdfChatContext() {
  const value = useContext(MarkdownToPdfChatContext);
  if (!value) {
    throw new Error("useMarkdownToPdfChatContext must be used within MarkdownToPdfChatProvider");
  }
  return value;
}
