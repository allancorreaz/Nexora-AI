import { BrainCircuit, Clock3, Cpu, UserRound } from "lucide-react";

type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
  model?: string;
  generationMs?: number;
};

export default function ChatMessage({
  role,
  content,
  model,
  generationMs,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <article
      className={`flex w-full gap-3 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Identificação de quem enviou */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          isUser
            ? "bg-zinc-800 text-zinc-300"
            : "bg-indigo-500/15 text-indigo-400"
        }`}
      >
        {isUser ? (
          <UserRound size={18} aria-hidden="true" />
        ) : (
          <BrainCircuit size={18} aria-hidden="true" />
        )}
      </div>

      {/* Conteúdo */}
      <div
        className={`flex max-w-[85%] min-w-0 flex-col gap-2 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <span className="px-1 text-xs font-medium text-zinc-500">
          {isUser ? "Você" : "Nexora AI"}
        </span>

        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-7 wrap-break-word whitespace-pre-wrap ${
            isUser
              ? "rounded-tr-sm bg-indigo-600 text-white"
              : "rounded-tl-sm border border-zinc-800 bg-zinc-900/70 text-zinc-200"
          }`}
        >
          {content}
        </div>
        {!isUser && (model || generationMs !== undefined) && (
          <div className="flex flex-wrap items-center gap-3 px-1 text-xs text-zinc-500">
            {model && (
              <span className="flex items-center gap-1">
                <Cpu size={13} aria-hidden="true" />
                {model}
              </span>
            )}
            {generationMs !== undefined && (
              <span className="flex items-center gap-1">
                <Clock3 size={13} aria-hidden="true" />
                {(generationMs / 1000).toLocaleString("pt-BR", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 2,
                })} s
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
