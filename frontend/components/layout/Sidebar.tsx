"use client";

import { useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  MessageSquare,
  PanelLeft,
  Plus,
  Settings2,
  Trash2,
  BrainCircuit,
} from "lucide-react";

import type { Conversation } from "@/types/chat";
import { Button } from "@/components/ui/button";

export type WorkspaceView = "chat" | "knowledge";

type SidebarProps = {
  activeView: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
};

const navigation = [
  {
    id: "chat",
    label: "Conversas",
    icon: MessageSquare,
  },
  {
    id: "knowledge",
    label: "Base de conhecimento",
    icon: BookOpen,
  },
  {
    id: "training",
    label: "Treinamentos",
    icon: GraduationCap,
  },
  {
    id: "settings",
    label: "Configurações",
    icon: Settings2,
  },
];

export default function Sidebar({
  activeView,
  onViewChange,
  conversations,
  activeConversationId,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 text-white transition-[width] duration-200 ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      {/* Cabeçalho */}
      <div className="flex h-20 items-center justify-between border-b border-zinc-800 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
            <BrainCircuit size={22} />
          </div>

          {!collapsed && (
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-tight">
                Nexora <span className="text-indigo-400">AI</span>
              </h2>
              <p className="text-[11px] text-zinc-500">
                Inteligência que conecta
              </p>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label="Recolher menu lateral"
            title="Recolher menu"
          >
            <PanelLeft size={18} />
          </button>
        )}
      </div>

      {/* Expandir Sidebar */}
      {collapsed && (
        <div className="px-4 pt-4">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="flex w-full items-center justify-center rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label="Expandir menu lateral"
            title="Expandir menu"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Nova conversa */}
      <div className="px-3 py-5">
        <Button
          type="button"
          onClick={() => {
            onViewChange("chat");
            onNewConversation();
          }}
          className={`h-11 bg-indigo-600 text-white hover:bg-indigo-500 ${
            collapsed ? "w-full px-0" : "w-full justify-start gap-3"
          }`}
          title="Nova conversa"
        >
          <Plus size={18} />
          {!collapsed && <span>Nova conversa</span>}
        </Button>
      </div>

      {/* Navegação */}
      <nav aria-label="Navegação principal" className="space-y-1 px-3">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id as WorkspaceView)}
              disabled={item.id !== "chat" && item.id !== "knowledge"}
              title={item.id === "training" || item.id === "settings" ? `${item.label} (em breve)` : item.label}
              aria-current={activeView === item.id ? "page" : undefined}
              className={`flex h-11 w-full items-center rounded-xl text-sm transition-colors ${
                collapsed ? "justify-center" : "gap-3 px-3"
              } ${
                activeView === item.id
                  ? "bg-zinc-800 font-medium text-white"
                  : item.id === "training" || item.id === "settings"
                    ? "cursor-not-allowed text-zinc-600"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Histórico */}
      {!collapsed && (
        <div className="mt-7 flex min-h-0 flex-1 flex-col px-3">
          <div className="mb-3 flex items-center justify-between px-3">
            <h3 className="text-[11px] font-semibold tracking-widest text-zinc-500 uppercase">
              Histórico
            </h3>

            <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">
              {conversations.length}
            </span>
          </div>

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="px-3 py-4 text-xs text-zinc-500">
                Nenhuma conversa iniciada.
              </p>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group flex items-center gap-1 rounded-xl pr-2 transition-colors ${
                    activeConversationId === conversation.id
                      ? "bg-zinc-800"
                      : "hover:bg-zinc-900"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onViewChange("chat");
                      onSelectConversation(conversation.id);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left text-sm text-zinc-300"
                    title={conversation.title}
                  >
                    <MessageSquare
                      size={15}
                      className="shrink-0 text-zinc-500"
                    />

                    <span className="truncate">{conversation.title}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteConversation(conversation.id)}
                    aria-label={`Excluir conversa ${conversation.title}`}
                    title="Excluir conversa"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 opacity-70 transition-colors group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 focus-visible:opacity-100"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Espaçamento no estado recolhido */}
      {collapsed && <div className="flex-1" />}

      {/* Rodapé */}
      <div className="border-t border-zinc-800 px-4 py-4">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-300">Nexora AI</p>
              <p className="mt-1 text-[11px] text-zinc-500">Versão 0.1.0</p>
            </div>

            <ChevronLeft
              size={16}
              className="text-zinc-600"
              aria-hidden="true"
            />
          </div>
        ) : (
          <p className="text-center text-[11px] text-zinc-500">v0.1</p>
        )}
      </div>
    </aside>
  );
}
