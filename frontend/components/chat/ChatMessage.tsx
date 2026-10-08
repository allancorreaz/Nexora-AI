
type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatMessage({
  role,
  content,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex w-full ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-5 py-4 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? "bg-indigo-600 text-white"
            : "border border-zinc-800 bg-zinc-900 text-zinc-200"
        }`}
      >
        <div className="mb-2 text-xs font-semibold opacity-70">
          {isUser ? "Você" : "Nexora AI"}
        </div>

        <p>{content}</p>
      </div>
    </div>
  );
}
