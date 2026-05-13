import type { Conversation } from "@/types";

type ConversationsListScreenProps = {
  conversations: Conversation[];
  activeConversationId: string;
  onOpenConversation: (id: string) => void;
};

export function ConversationsListScreen({
  conversations,
  activeConversationId,
  onOpenConversation,
}: ConversationsListScreenProps) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#fefefe] p-6 dark:bg-zinc-950">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">Lista de conversas</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Selecione uma conversa para abrir no editor/chat.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {conversations.length === 0 ? (
          <p className="col-span-full text-sm text-zinc-600 dark:text-zinc-300">
            Nenhuma conversa ainda. Crie uma a partir da tela inicial ou aguarde dados do servidor.
          </p>
        ) : null}
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            onClick={() => onOpenConversation(conversation.id)}
            className={`rounded-lg border p-4 text-left ${
              conversation.id === activeConversationId
                ? "border-zinc-300 ring-1 ring-zinc-300 dark:border-zinc-600 dark:ring-zinc-600"
                : "border-zinc-200 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            }`}
          >
            <div className="truncate text-sm font-semibold">{conversation.title}</div>
            <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
              {conversation.kind === "uml" ? "UML" : "Documento tecnico"} - {Object.keys(conversation.files).length} arquivo(s)
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
