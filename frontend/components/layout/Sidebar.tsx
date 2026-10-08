
"use client";

import { useState } from "react";
import type { Conversation } from "@/types/chat";

type SidebarProps = {
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
};

const navigation = [
  { id: "chat", label: "Conversas", icon: "◉" },
  { id: "knowledge", label: "Base de conhecimento", icon: "▤" },
  { id: "training", label: "Treinamentos", icon: "▣" },
  { id: "settings", label: "Configurações", icon: "⚙" },
];

export default function Sidebar({
  conversations,
  activeConversationId,
  onNewConversation,
  onSelectConversation,
}: SidebarProps) {
  const [activeItem, setActiveItem] = useState("chat");

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 text-white">
      {/* Identidade */}
      <div className="border-b border-zinc-800 px-6 py-6">
        <h2 className="text-xl font-bold tracking-tight">
          Nexora <span className="text-indigo-400">AI</span>
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Inteligência e conhecimento
        </p>
      </div>

      {/* Nova conversa */}
      <div className="px-4 py-5">
        <button
          type="button"
          onClick={() => {
            setActiveItem("chat");
            onNewConversation();
          }}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          + Nova conversa
        </button>
      </div>

      {/* Navegação */}
      <nav aria-label="Navegação principal" className="space-y-1 px-3">
        {navigation.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveItem(item.id)}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors ${
              activeItem === item.id
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
            }`}
          >
            <span aria-hidden="true" className="w-5 text-center">
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Histórico */}
      <div className="mt-6 flex min-h-0 flex-1 flex-col px-3">
        <h3 className="mb-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Histórico
        </h3>

        <div className="flex-1 space-y-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-4 py-3 text-xs text-zinc-500">
              Nenhuma conversa iniciada.
            </p>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => {
                  setActiveItem("chat");
                  onSelectConversation(conversation.id);
                }}
                className={`w-full truncate rounded-lg px-4 py-3 text-left text-sm transition-colors ${
                  activeConversationId === conversation.id
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
                title={conversation.title}
              >
                {conversation.title}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Rodapé */}
      <div className="border-t border-zinc-800 p-4">
        <p className="text-xs text-zinc-500">
          Nexora AI • Versão 0.1.0
        </p>
      </div>
    </aside>
  );
}
