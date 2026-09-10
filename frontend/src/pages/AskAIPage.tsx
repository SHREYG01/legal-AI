import { useState } from "react";
import { Send, ChevronDown } from "lucide-react";
import ChatMessage from "../components/ChatMessage";
import DisclaimerBanner from "../components/DisclaimerBanner";
import { mockChatMessages, mockContracts } from "../data/mockData";

export default function AskAIPage() {
  const [draft, setDraft] = useState("");
  const [selectedContract, setSelectedContract] = useState(mockContracts[0].id);

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <select
            value={selectedContract}
            onChange={(e) => setSelectedContract(e.target.value)}
            className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-ink-900 outline-none"
          >
            {mockContracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.filename}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
        <div className="max-w-md">
          <DisclaimerBanner compact />
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-card border border-slate-200 bg-white shadow-card">
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {mockChatMessages.map((m) => (
            <ChatMessage key={m.id} message={m} />
          ))}
        </div>
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask anything about this contract…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-600 text-white hover:bg-accent-700">
              <Send size={15} />
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Answers are grounded in the uploaded contract. If it's not in the document, Counsel will say so.
          </p>
        </div>
      </div>
    </div>
  );
}
