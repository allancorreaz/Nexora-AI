"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { ArrowUp, BrainCircuit, LoaderCircle } from "lucide-react";

import ChatMessage from "./ChatMessage";
import type { Message } from "@/types/chat";
import { Button } from "@/components/ui/button";

type ChatProps = {
  messages: Message[];
  onSendMessage: (content: string) => void | Promise<void>;
  isSending?: boolean;
};

const MAX_TEXTAREA_HEIGHT = 160;

export default function Chat({
  messages,
  onSendMessage,
  isSending = false,
}: ChatProps) {
  const [input, setInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mantém as mensagens mais recentes visíveis.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isSending]);

  // Ajusta automaticamente a altura do campo de texto.
  function adjustTextareaHeight(textarea: HTMLTextAreaElement) {
    textarea.style.height = "auto";

    const newHeight = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT);

    textarea.style.height = `${newHeight}px`;

    textarea.style.overflowY =
      textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }

  // Atualiza o conteúdo digitado.
  function handleInputChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const textarea = event.currentTarget;

    setInput(textarea.value);
    adjustTextareaHeight(textarea);
  }

  // Envia a mensagem para o ChatWorkspace.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = input.trim();

    if (!content || isSending) return;

    void onSendMessage(content);

    setInput("");

    // Restaura a altura inicial do campo.
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.overflowY = "hidden";
      textareaRef.current.focus();
    }
  }

  // Enter envia; Shift + Enter cria uma nova linha.
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();

      if (!isSending) {
        event.currentTarget.form?.requestSubmit();
      }
    }
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-zinc-950 text-white">
      {/* Cabeçalho do chat */}
      <header className="flex h-16 shrink-0 items-center border-b border-zinc-800/70 px-6">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-zinc-200">Nexora AI</h2>

          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
            IA Local
          </span>
        </div>
      </header>

      {/* Área de mensagens */}
      <div className="min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:#3f3f46_transparent] overflow-y-auto px-4 py-8 sm:px-8">
        {messages.length === 0 && !isSending ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
              <BrainCircuit size={30} strokeWidth={1.6} aria-hidden="true" />
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
                model={message.model}
                generationMs={message.generationMs}
              />
            ))}

            {/* Indicador de geração da resposta */}
            {isSending && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-3 text-sm text-zinc-400"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                  <BrainCircuit size={18} aria-hidden="true" />
                </div>

                <LoaderCircle
                  size={16}
                  className="animate-spin text-indigo-400"
                  aria-hidden="true"
                />

                <span>Nexora AI está pensando...</span>
              </div>
            )}

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
            placeholder={
              isSending
                ? "Aguarde a resposta da IA..."
                : "Pergunte ao Nexora AI..."
            }
            aria-label="Digite sua mensagem"
            aria-disabled={isSending}
            disabled={isSending}
            rows={1}
            className="min-h-10 min-w-0 flex-1 resize-none scrollbar-none overflow-y-hidden bg-transparent px-2 py-2 text-sm leading-6 text-white outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              maxHeight: MAX_TEXTAREA_HEIGHT,
            }}
          />

          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isSending}
            aria-label={isSending ? "Aguardando resposta" : "Enviar mensagem"}
            title={isSending ? "Aguardando resposta" : "Enviar mensagem"}
            className="h-10 w-10 shrink-0 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            {isSending ? (
              <LoaderCircle
                size={19}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <ArrowUp size={19} aria-hidden="true" />
            )}
          </Button>
        </form>

        <p className="mt-3 text-center text-xs text-zinc-500">
          Enter para enviar · Shift + Enter para nova linha
        </p>
      </div>
    </section>
  );
}
