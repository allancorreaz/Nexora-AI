"use client";

import { useEffect, useRef, useState } from "react";

import Sidebar from "@/components/layout/Sidebar";
import Chat from "@/components/chat/Chat";

import type { Conversation, Message } from "@/types/chat";
import { loadConversations, saveConversations } from "@/lib/chat-storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type ChatApiResponse = {
  response: string;
  model: string;
  generation_ms: number;
};

export default function ChatWorkspace() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendingRef = useRef(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setConversations(loadConversations());
      setIsLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

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
    setError(null);
  }

  function deleteConversation(conversationId: string) {
    const conversation = conversations.find(
      (item) => item.id === conversationId,
    );

    if (!conversation) return;

    const confirmed = window.confirm(
      `Tem certeza de que deseja excluir a conversa "${conversation.title}"?\n\nEsta ação não poderá ser desfeita.`,
    );

    if (!confirmed) return;

    setConversations((previous) =>
      previous.filter((item) => item.id !== conversationId),
    );

    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
    }
  }

  async function addMessage(content: string) {
    const trimmedContent = content.trim();

    if (!trimmedContent || sendingRef.current) return;

    sendingRef.current = true;
    setIsSending(true);
    setError(null);

    const now = new Date().toISOString();

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedContent,
      createdAt: now,
    };

    const conversationId = activeConversationId ?? crypto.randomUUID();

    const existingConversation = conversations.find(
      (conversation) => conversation.id === conversationId,
    );

    const previousMessages = existingConversation?.messages ?? [];
    const updatedMessages = [...previousMessages, userMessage];

    if (!existingConversation) {
      const newConversation: Conversation = {
        id: conversationId,
        title: trimmedContent.slice(0, 40),
        messages: updatedMessages,
        createdAt: now,
        updatedAt: now,
      };

      setConversations((previous) => [newConversation, ...previous]);
      setActiveConversationId(conversationId);
    } else {
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                title:
                  conversation.messages.length === 0
                    ? trimmedContent.slice(0, 40)
                    : conversation.title,
                messages: updatedMessages,
                updatedAt: now,
              }
            : conversation,
        ),
      );
    }

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages
            .slice(-30)
            .map(({ role, content: messageContent }) => ({
              role,
              content: messageContent,
            })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      const data: ChatApiResponse = await response.json();

      if (typeof data.response !== "string" || !data.response.trim()) {
        throw new Error("A IA retornou uma resposta vazia.");
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        createdAt: new Date().toISOString(),
        model: data.model,
        generationMs:
          Number.isFinite(data.generation_ms) && data.generation_ms >= 0
            ? data.generation_ms
            : undefined,
      };

      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: [...conversation.messages, assistantMessage],
                updatedAt: assistantMessage.createdAt,
              }
            : conversation,
        ),
      );
    } catch (caughtError) {
      console.error("Erro ao consultar a IA:", caughtError);

      setError(
        "Não foi possível obter uma resposta. Verifique se o FastAPI e o Ollama estão em execução.",
      );
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  }

  const activeConversation =
    conversations.find(
      (conversation) => conversation.id === activeConversationId,
    ) ?? null;

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
        onSelectConversation={(id) => {
          setActiveConversationId(id);
          setError(null);
        }}
        onDeleteConversation={deleteConversation}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {error && (
          <div
            role="alert"
            className="border-b border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <Chat
          key={activeConversationId ?? "new"}
          messages={activeConversation?.messages ?? []}
          onSendMessage={addMessage}
          isSending={isSending}
        />
      </div>
    </div>
  );
}
