import { Scale, User, MapPin } from "lucide-react";
import type { ChatMessageData } from "../types";

export default function ChatMessage({ message }: { message: ChatMessageData }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-ink-900 text-white" : "bg-accent-50 text-accent-600"
        }`}
      >
        {isUser ? <User size={14} /> : <Scale size={14} />}
      </span>
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1.5`}>
        <div
          className={`rounded-card px-4 py-2.5 text-sm ${
            isUser ? "bg-ink-900 text-white" : "border border-slate-200 bg-white text-slate-700 shadow-card"
          }`}
        >
          {message.text}
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.sources.map((s, i) => (
              <span
                key={i}
                className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-500"
              >
                <MapPin size={10} />
                {s.heading ?? (s.pageNumber ? `Page ${s.pageNumber}` : "Source")}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
