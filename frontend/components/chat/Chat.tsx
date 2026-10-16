"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { ArrowUp, BrainCircuit } from "lucide-react";

import ChatMessage from "./ChatMessage";
import type { Message } from "@/types/chat";
import { Button } from "@/components/ui/button";

type ChatProps = {
  messages: Message[];
  onSendMessage: (content: string) => void;
};

const MAX_TEXTAREA_HEIGHT = 160;

export default function Chat({ messages, onSendMessage }: ChatProps) {
  const [input, setInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mantém a última mensagem visível.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  // Ajusta a altura do campo conforme o conteúdo.
  function adjustTextareaHeight(textarea: HTMLTextAreaElement) {
    textarea.style.height = "auto";

    const newHeight = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT);

    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }

  // Atualiza o texto e ajusta a altura automaticamente.
  function handleInputChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const textarea = event.currentTarget;

    setInput(textarea.value);
    adjustTextareaHeight(textarea);
  }

  // Envia a mensagem.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = input.trim();

    if (!content) return;

    onSendMessage(content);
    setInput("");

    // Restaura o tamanho inicial do campo.
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.overflowY = "hidden";
      textareaRef.current.focus();
    }
  }

  // Enter envia; Shift + Enter adiciona uma nova linha.
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-zinc-950 text-white">
      {/* Cabeçalho */}
      <header className="flex h-16 shrink-0 items-center border-b border-zinc-800/70 px-6">
        <h2 className="text-sm font-medium text-zinc-300">Nexora AI</h2>
      </header>

      {/* Área de mensagens */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
              <BrainCircuit size={30} strokeWidth={1.6} />
            </div>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Como posso ajudar?
            </h1>

            <p className="mt-4 max-w-md text-sm leading-7 text-zinc-400">
              Conhecimento inteligente, respostas confiáveis. Converse com o
              Nexora AI e encontre o que precisa.
            </p>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
              />
            ))}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Área de digitação */}
      <div className="shrink-0 px-4 pt-3 pb-5 sm:px-8">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex w-full max-w-3xl items-end gap-3 rounded-2xl border border-zinc-700 bg-zinc-900 p-3 shadow-lg shadow-black/10 transition-colors focus-within:border-zinc-500"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte ao Nexora AI..."
            aria-label="Digite sua mensagem"
            rows={1}
            className="min-h-10 min-w-0 flex-1 resize-none overflow-y-hidden bg-transparent px-2 py-2 text-sm leading-6 text-white outline-none placeholder:text-zinc-500 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
          />

          <Button
            type="submit"
            size="icon"
            disabled={!input.trim()}
            aria-label="Enviar mensagem"
            title="Enviar mensagem"
            className="h-10 w-10 shrink-0 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            <ArrowUp size={19} />
          </Button>
        </form>

        <p className="mt-3 text-center text-xs text-zinc-500">
          Enter para enviar · Shift + Enter para nova linha
        </p>
      </div>
    </section>
  );
}
