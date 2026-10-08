
"use client";

import { useState, type FormEvent } from "react";
import ChatMessage from "./ChatMessage";
import type { Message } from "@/types/chat";

type ChatProps = {
  messages: Message[];
  onSendMessage: (content: string) => void;
};

export default function Chat({
  messages,
  onSendMessage,
}: ChatProps) {
  const [input, setInput] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = input.trim();

    if (!content) return;

    onSendMessage(content);
    setInput("");
  }

  return (
    <section className="flex h-screen min-w-0 flex-1 flex-col bg-zinc-950 text-white">
      {/* Área de mensagens */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/15 text-3xl font-bold text-indigo-400">
              N
            </div>

            <h1 className="text-3xl font-bold">
              Nexora <span className="text-indigo-400">AI</span>
            </h1>

            <p className="mt-4 max-w-md text-zinc-400">
              Seu conhecimento, conectado à inteligência.
              Como posso ajudar você hoje?
            </p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
              />
            ))}
          </div>
        )}
      </div>

      {/* Campo de envio */}
      <div className="border-t border-zinc-800 p-5">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-900 p-3"
        >
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Pergunte ao Nexora AI..."
            aria-label="Digite sua mensagem"
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500"
          />

          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Enviar
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-zinc-500">
          Versão de desenvolvimento — IA ainda não conectada.
        </p>
      </div>
    </section>
  );
}
