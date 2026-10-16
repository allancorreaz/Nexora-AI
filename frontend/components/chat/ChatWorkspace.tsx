"use client";

import { useEffect, useState } from "react";

import Sidebar from "@/components/layout/Sidebar";
import Chat from "@/components/chat/Chat";

import type { Conversation, Message } from "@/types/chat";

import { loadConversations, saveConversations } from "@/lib/chat-storage";

export default function ChatWorkspace() {
  // Armazena todas as conversas.
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Identifica a conversa selecionada.
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  // Controla a inicialização do histórico.
  const [isLoaded, setIsLoaded] = useState(false);

  // Recupera o histórico após a montagem do componente.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const saved = loadConversations();

      setConversations(saved);
      setIsLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  // Salva automaticamente as alterações no histórico.
  useEffect(() => {
    if (!isLoaded) return;

    saveConversations(conversations);
  }, [conversations, isLoaded]);

  // Cria uma nova conversa vazia.
  function createConversation() {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const conversation: Conversation = {
      id,
      title: "Nova conversa",
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    setConversations((previous) => [conversation, ...previous]);
    setActiveConversationId(id);
  }

  // Exclui uma conversa mediante confirmação.
  function deleteConversation(conversationId: string) {
    const conversation = conversations.find(
      (item) => item.id === conversationId,
    );

    if (!conversation) return;

    const confirmed = window.confirm(
      `Tem certeza de que deseja excluir a conversa "${conversation.title}"?\n\nEsta ação não poderá ser desfeita.`,
    );

    if (!confirmed) return;

    // Remove somente a conversa selecionada.
    setConversations((previous) =>
      previous.filter((item) => item.id !== conversationId),
    );

    // Limpa a seleção se a conversa excluída estiver aberta.
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
    }
  }

  // Adiciona uma mensagem à conversa atual.
  function addMessage(content: string) {
    const trimmedContent = content.trim();

    if (!trimmedContent) return;

    const now = new Date().toISOString();

    const message: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedContent,
      createdAt: now,
    };

    // Cria automaticamente uma conversa, caso não exista uma ativa.
    if (!activeConversationId) {
      const conversationId = crypto.randomUUID();

      const newConversation: Conversation = {
        id: conversationId,
        title: trimmedContent.slice(0, 40),
        messages: [message],
        createdAt: now,
        updatedAt: now,
      };

      setConversations((previous) => [newConversation, ...previous]);
      setActiveConversationId(conversationId);

      return;
    }

    // Adiciona a mensagem à conversa selecionada.
    setConversations((previous) =>
      previous.map((conversation) => {
        if (conversation.id !== activeConversationId) {
          return conversation;
        }

        const isFirstMessage = conversation.messages.length === 0;

        return {
          ...conversation,
          title: isFirstMessage
            ? trimmedContent.slice(0, 40)
            : conversation.title,
          messages: [...conversation.messages, message],
          updatedAt: now,
        };
      }),
    );
  }

  // Localiza a conversa ativa.
  const activeConversation =
    conversations.find(
      (conversation) => conversation.id === activeConversationId,
    ) ?? null;

  // Aguarda a recuperação do histórico.
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Carregando Nexora AI...
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-white">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewConversation={createConversation}
        onSelectConversation={setActiveConversationId}
        onDeleteConversation={deleteConversation}
      />

      <Chat
        key={activeConversationId ?? "new"}
        messages={activeConversation?.messages ?? []}
        onSendMessage={addMessage}
      />
    </div>
  );
}
