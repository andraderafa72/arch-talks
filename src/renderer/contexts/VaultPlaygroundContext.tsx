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
import { DEFAULT_VAULT_PLAYGROUND_SKILL_ID } from "@/lib/uiCopy";
import { isAbortError, stoppedAssistantContent } from "@/lib/localAiErrors";
import { useEditorStore } from "@/state/store";
import type { VaultSkill } from "@/types/vaultSkill";
import type { LocalAiSelection } from "@/types/electron-api";

export type VaultPlaygroundMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

type VaultPlaygroundContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  messages: VaultPlaygroundMessage[];
  skills: VaultSkill[];
  skillsLoading: boolean;
  selectedSkillId: string;
  setSelectedSkillId: (id: string) => void;
  activeAiSelection: LocalAiSelection | undefined;
  setActiveAiSelection: (selection: LocalAiSelection | undefined) => void;
  isSending: boolean;
  streamingAssistantText: string | null;
  sendMessage: (prompt: string) => Promise<void>;
  stopMessage: () => Promise<void>;
  clearMessages: () => void;
  navigateToFile: (path: string) => void;
};

const VaultPlaygroundContext = createContext<VaultPlaygroundContextValue | null>(null);

const DEFAULT_BUILTIN_SKILLS: VaultSkill[] = [
  {
    id: DEFAULT_VAULT_PLAYGROUND_SKILL_ID,
    name: "Vault search",
    description: "Search vault notes by title, tags, and body during consumption.",
    content: "",
    builtin: true,
  },
];

type VaultPlaygroundProviderProps = {
  documentId: string;
  vaultName?: string;
  activeFile: string;
  files: Record<string, string>;
  knownPaths: string[];
  onSelectFile: (path: string) => void;
  children: ReactNode;
};

function resolveElectronApi() {
  if (typeof window === "undefined") return undefined;
  return window.electronApi;
}

export function VaultPlaygroundProvider({
  documentId,
  vaultName,
  activeFile,
  files,
  knownPaths,
  onSelectFile,
  children,
}: VaultPlaygroundProviderProps) {
  const locale = useEditorStore((state) => state.locale);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<VaultPlaygroundMessage[]>([]);
  const [skills, setSkills] = useState<VaultSkill[]>(DEFAULT_BUILTIN_SKILLS);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [selectedSkillId, setSelectedSkillId] = useState(DEFAULT_VAULT_PLAYGROUND_SKILL_ID);
  const [activeAiSelection, setActiveAiSelection] = useState<LocalAiSelection | undefined>(undefined);
  const [isSending, setIsSending] = useState(false);
  const [streamingAssistantText, setStreamingAssistantText] = useState<string | null>(null);
  const streamingTextRef = useRef("");
  const activeStreamIdRef = useRef<string | null>(null);
  const skillStorageKey = `vault-playground-skill:${documentId}`;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setSkillsLoading(true);
      try {
        const api = resolveElectronApi();
        const list = api?.vaultSkillsList
          ? await api.vaultSkillsList()
          : DEFAULT_BUILTIN_SKILLS;
        if (cancelled) return;
        setSkills(list.length > 0 ? list : DEFAULT_BUILTIN_SKILLS);
        const stored = localStorage.getItem(skillStorageKey);
        const fallback = list.some((skill) => skill.id === DEFAULT_VAULT_PLAYGROUND_SKILL_ID)
          ? DEFAULT_VAULT_PLAYGROUND_SKILL_ID
          : (list[0]?.id ?? DEFAULT_VAULT_PLAYGROUND_SKILL_ID);
        setSelectedSkillId(stored && list.some((skill) => skill.id === stored) ? stored : fallback);
      } catch {
        if (!cancelled) setSkills(DEFAULT_BUILTIN_SKILLS);
      } finally {
        if (!cancelled) setSkillsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [documentId, skillStorageKey]);

  useEffect(() => {
    if (!selectedSkillId) return;
    localStorage.setItem(skillStorageKey, selectedSkillId);
  }, [selectedSkillId, skillStorageKey]);

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

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isOpen]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((value) => !value), []);

  const navigateToFile = useCallback(
    (path: string) => {
      const normalized = path.trim().replace(/^\.\//, "");
      const match =
        knownPaths.find((item) => item === normalized) ??
        knownPaths.find((item) => item.toLowerCase() === normalized.toLowerCase()) ??
        knownPaths.find((item) => item.endsWith(`/${normalized}`));
      if (match) onSelectFile(match);
    },
    [knownPaths, onSelectFile],
  );

  const sendMessage = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || isSending) return;

      const userMessage: VaultPlaygroundMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
      };
      setMessages((current) => [...current, userMessage]);
      setIsSending(true);

      const api = resolveElectronApi();
      if (!api?.vaultConsumptionChatSend) {
        const errMessage: VaultPlaygroundMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            locale === "pt"
              ? "O playground requer a app Electron com IA local configurada."
              : "The playground requires the Electron app with local AI configured.",
          timestamp: new Date().toISOString(),
        };
        setMessages((current) => [...current, errMessage]);
        setIsSending(false);
        return;
      }

      const streamId = crypto.randomUUID();
      activeStreamIdRef.current = streamId;
      streamingTextRef.current = "";
      setStreamingAssistantText("");

      try {
        const response = await api.vaultConsumptionChatSend({
          sessionKey: `vault-playground:${documentId}`,
          documentId,
          activeFile,
          files,
          prompt: trimmed,
          aiSelection: activeAiSelection,
          streamId,
          skillId: selectedSkillId,
          vaultName,
        });
        activeStreamIdRef.current = null;
        streamingTextRef.current = "";
        setStreamingAssistantText(null);
        const assistantMessage: VaultPlaygroundMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.reply || "(no response)",
          timestamp: new Date().toISOString(),
        };
        setMessages((current) => [...current, assistantMessage]);
      } catch (error: unknown) {
        activeStreamIdRef.current = null;
        const partial = streamingTextRef.current;
        streamingTextRef.current = "";
        setStreamingAssistantText(null);
        if (isAbortError(error)) {
          const stoppedContent = stoppedAssistantContent(partial, locale);
          if (stoppedContent) {
            const assistantMessage: VaultPlaygroundMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: stoppedContent,
              timestamp: new Date().toISOString(),
            };
            setMessages((current) => [...current, assistantMessage]);
          }
          return;
        }
        const msg = error instanceof Error ? error.message : "Failed to reach local AI.";
        const errMessage: VaultPlaygroundMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Error: ${msg}`,
          timestamp: new Date().toISOString(),
        };
        setMessages((current) => [...current, errMessage]);
      } finally {
        setIsSending(false);
      }
    },
    [
      activeAiSelection,
      activeFile,
      documentId,
      files,
      isSending,
      locale,
      selectedSkillId,
      vaultName,
    ],
  );

  const stopMessage = useCallback(async () => {
    const api = resolveElectronApi();
    if (!api?.aiChatCancel) return;
    await api.aiChatCancel(`vault-playground:${documentId}`);
  }, [documentId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    activeStreamIdRef.current = null;
    streamingTextRef.current = "";
    setStreamingAssistantText(null);
  }, []);

  const value = useMemo<VaultPlaygroundContextValue>(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      messages,
      skills,
      skillsLoading,
      selectedSkillId,
      setSelectedSkillId,
      activeAiSelection,
      setActiveAiSelection,
      isSending,
      streamingAssistantText,
      sendMessage,
      stopMessage,
      clearMessages,
      navigateToFile,
    }),
    [
      isOpen,
      open,
      close,
      toggle,
      messages,
      skills,
      skillsLoading,
      selectedSkillId,
      activeAiSelection,
      isSending,
      streamingAssistantText,
      sendMessage,
      stopMessage,
      clearMessages,
      navigateToFile,
    ],
  );

  return <VaultPlaygroundContext.Provider value={value}>{children}</VaultPlaygroundContext.Provider>;
}

export function useVaultPlaygroundContext() {
  const value = useContext(VaultPlaygroundContext);
  if (!value) {
    throw new Error("useVaultPlaygroundContext must be used within VaultPlaygroundProvider");
  }
  return value;
}

export function useOptionalVaultPlaygroundContext() {
  return useContext(VaultPlaygroundContext);
}
