import { useEffect, useState } from "react";
import { Send, ChevronDown } from "lucide-react";
import ChatMessage from "../components/ChatMessage";
import DisclaimerBanner from "../components/DisclaimerBanner";
import { askQuestion, getContracts } from "../services/api";
import type { ChatMessageData, ContractMetadata } from "../types";
import { LoadingState } from "../components/LoadingState";

export default function AskAIPage() {
  const [contracts, setContracts] = useState<ContractMetadata[]>([]);
  const [selectedContract, setSelectedContract] = useState("");
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void getContracts().then((items) => { setContracts(items); setSelectedContract(items[0]?.contract_id ?? ""); }).catch((err) => setError(err instanceof Error ? err.message : "Unable to load contracts.")); }, []);
  const send = async () => {
    const question = draft.trim(); if (!question || !selectedContract) return;
    setDraft(""); setMessages((items) => [...items, { id: `${Date.now()}-q`, role: "user", text: question }]); setLoading(true); setError(null);
    try { const answer = await askQuestion(selectedContract, question); setMessages((items) => [...items, { id: `${Date.now()}-a`, role: "assistant", text: answer.answer, sources: answer.sources.map((s) => ({ pageNumber: s.page_number, heading: s.heading })) }]); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to answer question."); } finally { setLoading(false); }
  };
  return <div className="flex h-[calc(100vh-8.5rem)] flex-col gap-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="relative"><select value={selectedContract} onChange={(e) => setSelectedContract(e.target.value)} className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-ink-900 outline-none">{contracts.map((contract) => <option key={contract.contract_id} value={contract.contract_id}>{contract.filename}</option>)}</select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /></div><div className="max-w-md"><DisclaimerBanner compact /></div></div>{error && <div className="rounded-lg border border-risk-high/20 bg-risk-high/5 px-4 py-3 text-sm text-risk-high">{error}</div>}{!contracts.length && !error ? <LoadingState /> : <div className="flex flex-1 flex-col overflow-hidden rounded-card border border-slate-200 bg-white shadow-card"><div className="flex-1 space-y-4 overflow-y-auto p-6">{messages.map((message) => <ChatMessage key={message.id} message={message} />)}{loading && <LoadingState label="Counsel is thinking…" />}</div><div className="border-t border-slate-200 p-4"><div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5"><input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void send()} placeholder="Ask anything about this contract…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" /><button onClick={() => void send()} disabled={loading || !selectedContract} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-600 text-white hover:bg-accent-700 disabled:opacity-50"><Send size={15} /></button></div><p className="mt-2 text-xs text-slate-400">Answers are grounded in the uploaded contract. If it's not in the document, Counsel will say so.</p></div></div>}</div>;
}
