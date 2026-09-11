import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Send, FileText, Users, Clock, Wallet, ListChecks, Gavel, ShieldAlert } from "lucide-react";
import RiskCard from "../components/RiskCard";
import ClauseCard from "../components/ClauseCard";
import DeadlineCard from "../components/DeadlineCard";
import ChatMessage from "../components/ChatMessage";
import DisclaimerBanner from "../components/DisclaimerBanner";
import EmptyState from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { askQuestion, getClauses, getContract, getDeadlines, getObligations, getRisks, getSummary } from "../services/api";
import type { ChatMessageData, Clause, ContractDetails, DateItem, Obligation, RiskFinding } from "../types";
import type { ApiDeadlinesResponse, ApiSummaryResponse } from "../types";

type Tab = "overview" | "summary" | "clauses" | "risks" | "obligations" | "deadlines" | "ask";
const tabs: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" }, { key: "summary", label: "Summary" },
  { key: "clauses", label: "Clauses" }, { key: "risks", label: "Risks" },
  { key: "obligations", label: "Obligations" }, { key: "deadlines", label: "Deadlines" }, { key: "ask", label: "Ask AI" },
];

export default function ContractAnalysisPage() {
  const { id = "" } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [contract, setContract] = useState<ContractDetails | null>(null);
  const [summary, setSummary] = useState<ApiSummaryResponse | null>(null);
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [risks, setRisks] = useState<RiskFinding[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [deadlines, setDeadlines] = useState<ApiDeadlinesResponse["deadlines"] | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void getContract(id).then(setContract).catch((err) => setError(err instanceof Error ? err.message : "Unable to load contract."));
  }, [id]);

  useEffect(() => {
    if (!id || activeTab === "overview" || activeTab === "ask") return;
    setLoading(true); setError(null);
    const load = activeTab === "summary" && !summary ? getSummary(id).then(setSummary)
      : activeTab === "clauses" && !clauses.length ? getClauses(id).then((r) => setClauses(r.clauses.map((c) => ({ chunkIndex: c.chunk_index, pageNumber: c.page_number, heading: c.heading, text: c.text, category: c.category, confidence: c.confidence }))))
      : activeTab === "risks" && !risks.length ? getRisks(id).then((r) => setRisks(r.risks.map((risk, index) => ({ id: `${id}-${index}`, title: risk.title, severity: risk.severity, explanation: risk.explanation, evidence: risk.evidence, pageNumber: risk.page_number, section: risk.section }))))
      : activeTab === "obligations" && !obligations.length ? getObligations(id).then((r) => setObligations(r.obligations.map((o) => ({ responsibleParty: o.responsible_party, obligation: o.obligation, deadline: o.deadline, section: o.section, pageNumber: o.page_number }))))
      : activeTab === "deadlines" && !deadlines ? getDeadlines(id).then((r) => setDeadlines(r.deadlines))
      : Promise.resolve();
    void load.catch((err) => setError(err instanceof Error ? err.message : "Unable to load analysis.")).finally(() => setLoading(false));
  }, [activeTab, id, summary, clauses.length, risks.length, obligations.length, deadlines]);

  const sendQuestion = async () => {
    const question = draft.trim();
    if (!question || !id) return;
    setDraft(""); setMessages((current) => [...current, { id: `${Date.now()}-q`, role: "user", text: question }]); setLoading(true); setError(null);
    try {
      const answer = await askQuestion(id, question);
      setMessages((current) => [...current, { id: `${Date.now()}-a`, role: "assistant", text: answer.answer, sources: answer.sources.map((s) => ({ pageNumber: s.page_number, heading: s.heading })) }]);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to answer question."); }
    finally { setLoading(false); }
  };

  if (!contract) return <LoadingState />;
  return <div className="flex flex-col gap-6">
    <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><FileText size={20} /></span><div><h2 className="font-medium text-ink-900">{contract.filename}</h2><p className="text-sm text-slate-500">{contract.num_pages ?? "—"} pages · Uploaded {new Date(contract.upload_date).toLocaleDateString()}</p></div></div>
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200">{tabs.map((tab) => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium ${activeTab === tab.key ? "border-accent-600 text-accent-700" : "border-transparent text-slate-500 hover:text-ink-900"}`}>{tab.label}</button>)}</div>
    {error && <div className="rounded-lg border border-risk-high/20 bg-risk-high/5 px-4 py-3 text-sm text-risk-high">{error}</div>}
    {loading && <LoadingState />}
    {!loading && activeTab === "overview" && <Overview contract={contract} summary={summary} risks={risks} obligations={obligations} onLoadSummary={() => setActiveTab("summary")} />}
    {!loading && activeTab === "summary" && summary && <SummaryView summary={summary} />}
    {!loading && activeTab === "clauses" && <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{clauses.length ? clauses.map((clause) => <ClauseCard key={clause.chunkIndex} clause={clause} />) : <EmptyState icon={FileText} title="No clauses found" description="No classified clauses were returned for this contract." />}</div>}
    {!loading && activeTab === "risks" && <div className="flex flex-col gap-4">{risks.length ? risks.map((risk) => <RiskCard key={risk.id} risk={risk} />) : <EmptyState icon={ShieldAlert} title="No risks detected" description="No notable risks were returned for this contract." />}</div>}
    {!loading && activeTab === "obligations" && <ObligationsView obligations={obligations} />}
    {!loading && activeTab === "deadlines" && deadlines && <DeadlinesView deadlines={deadlines} />}
    {!loading && activeTab === "ask" && <div className="flex h-[520px] flex-col rounded-card border border-slate-200 bg-white shadow-card"><div className="flex-1 space-y-4 overflow-y-auto p-5">{messages.map((message) => <ChatMessage key={message.id} message={message} />)}</div><div className="border-t border-slate-200 p-4"><div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"><input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void sendQuestion()} placeholder="Ask a question about this contract…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" /><button onClick={() => void sendQuestion()} className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600 text-white hover:bg-accent-700"><Send size={14} /></button></div></div></div>}
  </div>;
}

function Overview({ contract, summary, risks, obligations, onLoadSummary }: { contract: ContractDetails; summary: ApiSummaryResponse | null; risks: RiskFinding[]; obligations: Obligation[]; onLoadSummary: () => void }) { return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"><OverviewCard icon={Users} label="Segments" value={`${contract.num_segments} extracted`} /><OverviewCard icon={Clock} label="Pages" value={`${contract.num_pages ?? "—"} pages`} /><OverviewCard icon={ShieldAlert} label="Risks flagged" value={`${risks.length || "—"} findings`} /><OverviewCard icon={ListChecks} label="Obligations" value={`${obligations.length || "—"} tracked`} /><div className="sm:col-span-2 lg:col-span-4 rounded-card border border-slate-200 bg-white p-5 shadow-card"><h3 className="font-medium text-ink-900">Contract purpose</h3><p className="mt-2 text-sm text-slate-600">{summary?.summary.contract_purpose ?? "Open the Summary tab to generate the contract purpose and key terms."}</p><button onClick={onLoadSummary} className="mt-3 text-sm font-medium text-accent-600">Load summary →</button></div><div className="sm:col-span-2 lg:col-span-4"><DisclaimerBanner compact /></div></div>; }
function SummaryView({ summary }: { summary: ApiSummaryResponse }) { const value = summary.summary; return <div className="grid grid-cols-1 gap-4 lg:grid-cols-2"><SummaryBlock icon={FileText} title="Contract purpose">{value.contract_purpose}</SummaryBlock><SummaryBlock icon={Users} title="Parties"><ul className="list-disc pl-4">{value.parties.map((party) => <li key={party}>{party}</li>)}</ul></SummaryBlock><SummaryBlock icon={Clock} title="Duration">{value.duration}</SummaryBlock><SummaryBlock icon={Wallet} title="Payment terms">{value.payment_terms}</SummaryBlock><SummaryBlock icon={ListChecks} title="Key obligations"><ul className="list-disc pl-4">{value.key_obligations.map((item) => <li key={item}>{item}</li>)}</ul></SummaryBlock><SummaryBlock icon={Gavel} title="Termination conditions">{value.termination_conditions}</SummaryBlock><div className="lg:col-span-2"><SummaryBlock icon={FileText} title="Important clauses"><div className="flex flex-wrap gap-2">{value.important_clauses.map((item) => <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{item}</span>)}</div></SummaryBlock></div></div>; }
function ObligationsView({ obligations }: { obligations: Obligation[] }) { return <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Party</th><th className="px-4 py-3">Obligation</th><th className="px-4 py-3">Deadline</th><th className="px-4 py-3">Page</th></tr></thead><tbody className="divide-y divide-slate-100">{obligations.map((item, index) => <tr key={index}><td className="px-4 py-3 font-medium text-ink-900">{item.responsibleParty ?? "—"}</td><td className="px-4 py-3 text-slate-600">{item.obligation}</td><td className="px-4 py-3 text-slate-600">{item.deadline ?? "—"}</td><td className="px-4 py-3 text-slate-400">{item.pageNumber ?? "—"}</td></tr>)}</tbody></table></div>; }
function DeadlinesView({ deadlines }: { deadlines: ApiDeadlinesResponse["deadlines"] }) { const items: DateItem[] = [{ description: "Contract start date", dateOrTimeframe: deadlines.contract_start_date, pageNumber: null }, { description: "Contract end date", dateOrTimeframe: deadlines.contract_end_date, pageNumber: null }, { description: "Renewal terms", dateOrTimeframe: deadlines.renewal_date, pageNumber: null }, { description: "Termination notice period", dateOrTimeframe: deadlines.termination_notice_period, pageNumber: null }, ...[...deadlines.payment_deadlines, ...deadlines.delivery_deadlines, ...deadlines.other_dates].map((item) => ({ description: item.description, dateOrTimeframe: item.date_or_timeframe, pageNumber: item.page_number }))]; return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{items.map((item, index) => <DeadlineCard key={index} item={item} />)}</div>; }
function OverviewCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) { return <div className="rounded-card border border-slate-200 bg-white p-4 shadow-card"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-50 text-accent-600"><Icon size={15} /></span><p className="mt-3 text-xs text-slate-500">{label}</p><p className="text-sm font-medium text-ink-900">{value}</p></div>; }
function SummaryBlock({ icon: Icon, title, children }: { icon: typeof Users; title: string; children: React.ReactNode }) { return <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card"><div className="flex items-center gap-2"><Icon size={16} className="text-accent-600" /><h3 className="font-medium text-ink-900">{title}</h3></div><div className="mt-2 text-sm text-slate-600">{children}</div></div>; }
