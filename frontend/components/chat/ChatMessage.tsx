import { BrainCircuit, Clock3, Cpu, UserRound } from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

      <div
        className={`flex max-w-[85%] min-w-0 flex-col gap-2 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <span className="px-1 text-xs font-medium text-zinc-500">
          {isUser ? "Você" : "Nexora AI"}
        </span>

        <div
          className={`wrap-break-words max-w-full min-w-0 rounded-2xl px-4 py-3 text-sm leading-7 ${
            isUser
              ? "rounded-tr-sm bg-indigo-600 text-white"
              : "rounded-tl-sm border border-zinc-800 bg-zinc-900/70 text-zinc-200"
          }`}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{content}</div>
          ) : (
            <div className="space-y-3 [&_a]:text-indigo-400 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-600 [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-zinc-800 [&_code]:px-1 [&_code]:py-0.5 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-zinc-950 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_td]:border [&_td]:border-zinc-700 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-zinc-700 [&_th]:px-3 [&_th]:py-2 [&_ul]:list-disc [&_ul]:pl-5">
              <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
                {content}
              </ReactMarkdown>
            </div>
          )}
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
                })}{" "}
                s
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
