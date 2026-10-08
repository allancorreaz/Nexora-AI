
"use client";

import { useEffect, useState } from "react";

import Sidebar from "@/components/layout/Sidebar";
import Chat from "@/components/chat/Chat";

import type { Conversation, Message } from "@/types/chat";

import {
  loadConversations,
  saveConversations,
} from "@/lib/chat-storage";

export default function ChatWorkspace() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] =
    useState<string | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);

  // Recupera o histórico quando o componente é montado.
  useEffect(() => {
    const saved = loadConversations();

    setConversations(saved);
    setIsLoaded(true);
  }, []);

  // Salva somente depois que o histórico foi carregado.
  useEffect(() => {
    if (!isLoaded) return;

    saveConversations(conversations);
  }, [conversations, isLoaded]);

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

  function addMessage(content: string) {
    const now = new Date().toISOString();

    const message: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: now,
    };

    if (!activeConversationId) {
      const conversationId = crypto.randomUUID();

      setConversations((previous) => [
        {
          id: conversationId,
          title: content.slice(0, 40),
          messages: [message],
          createdAt: now,
          updatedAt: now,
        },
        ...previous,
      ]);

      setActiveConversationId(conversationId);
      return;
    }

    setConversations((previous) =>
      previous.map((conversation) => {
        if (conversation.id !== activeConversationId) {
          return conversation;
        }

        const isFirstMessage = conversation.messages.length === 0;

        return {
          ...conversation,
          title: isFirstMessage
            ? content.slice(0, 40)
            : conversation.title,
          messages: [...conversation.messages, message],
          updatedAt: now,
        };
      })
    );
  }

  const activeConversation =
    conversations.find(
      (conversation) => conversation.id === activeConversationId
    ) ?? null;

  // Evita exibir a interface antes da recuperação do histórico.
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
      />

      <Chat
        key={activeConversationId ?? "new"}
        messages={activeConversation?.messages ?? []}
        onSendMessage={addMessage}
      />
    </div>
  );
}
