import { useState } from "react";
import { useParams } from "react-router-dom";
import { Send, FileText, Users, Clock, Wallet, ListChecks, Gavel } from "lucide-react";
import RiskCard from "../components/RiskCard";
import ClauseCard from "../components/ClauseCard";
import DeadlineCard from "../components/DeadlineCard";
import ChatMessage from "../components/ChatMessage";
import DisclaimerBanner from "../components/DisclaimerBanner";
import EmptyState from "../components/EmptyState";
import {
  mockSummary,
  mockClauses,
  mockRisks,
  mockObligations,
  mockDeadlines,
  mockChatMessages,
  mockContracts,
} from "../data/mockData";
import { ShieldAlert } from "lucide-react";

type Tab = "overview" | "summary" | "clauses" | "risks" | "obligations" | "deadlines" | "ask";

const tabs: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "summary", label: "Summary" },
  { key: "clauses", label: "Clauses" },
  { key: "risks", label: "Risks" },
  { key: "obligations", label: "Obligations" },
  { key: "deadlines", label: "Deadlines" },
  { key: "ask", label: "Ask AI" },
];

export default function ContractAnalysisPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [draft, setDraft] = useState("");

  const contract = mockContracts.find((c) => c.id === id) ?? mockContracts[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <FileText size={20} />
        </span>
        <div>
          <h2 className="font-medium text-ink-900">{contract.filename}</h2>
          <p className="text-sm text-slate-500">{contract.pages} pages · Uploaded {contract.uploadDate}</p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? "border-accent-600 text-accent-700"
                : "border-transparent text-slate-500 hover:text-ink-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewCard icon={Users} label="Parties" value={`${mockSummary.parties.length} parties`} />
          <OverviewCard icon={Clock} label="Duration" value={mockSummary.duration.split(",")[0]} />
          <OverviewCard icon={ShieldAlert} label="Risks flagged" value={`${mockRisks.length} findings`} />
          <OverviewCard icon={ListChecks} label="Obligations" value={`${mockObligations.length} tracked`} />
          <div className="sm:col-span-2 lg:col-span-4 rounded-card border border-slate-200 bg-white p-5 shadow-card">
            <h3 className="font-medium text-ink-900">Contract purpose</h3>
            <p className="mt-2 text-sm text-slate-600">{mockSummary.contractPurpose}</p>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <DisclaimerBanner compact />
          </div>
        </div>
      )}

      {activeTab === "summary" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SummaryBlock icon={FileText} title="Contract purpose">{mockSummary.contractPurpose}</SummaryBlock>
          <SummaryBlock icon={Users} title="Parties">
            <ul className="list-disc pl-4">{mockSummary.parties.map((p) => <li key={p}>{p}</li>)}</ul>
          </SummaryBlock>
          <SummaryBlock icon={Clock} title="Duration">{mockSummary.duration}</SummaryBlock>
          <SummaryBlock icon={Wallet} title="Payment terms">{mockSummary.paymentTerms}</SummaryBlock>
          <SummaryBlock icon={ListChecks} title="Key obligations">
            <ul className="list-disc pl-4">{mockSummary.keyObligations.map((o) => <li key={o}>{o}</li>)}</ul>
          </SummaryBlock>
          <SummaryBlock icon={Gavel} title="Termination conditions">{mockSummary.terminationConditions}</SummaryBlock>
          <div className="lg:col-span-2">
            <SummaryBlock icon={FileText} title="Important clauses">
              <div className="flex flex-wrap gap-2">
                {mockSummary.importantClauses.map((c) => (
                  <span key={c} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {c}
                  </span>
                ))}
              </div>
            </SummaryBlock>
          </div>
        </div>
      )}

      {activeTab === "clauses" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {mockClauses.map((c) => (
            <ClauseCard key={c.chunkIndex} clause={c} />
          ))}
        </div>
      )}

      {activeTab === "risks" && (
        <div className="flex flex-col gap-4">
          {mockRisks.length > 0 ? (
            mockRisks.map((r) => <RiskCard key={r.id} risk={r} />)
          ) : (
            <EmptyState icon={ShieldAlert} title="No risks detected" description="Counsel didn't find any notable risk in this contract." />
          )}
        </div>
      )}

      {activeTab === "obligations" && (
        <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Party</th>
                <th className="px-4 py-3 font-medium">Obligation</th>
                <th className="px-4 py-3 font-medium">Deadline</th>
                <th className="px-4 py-3 font-medium">Page</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockObligations.map((o, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 font-medium text-ink-900">{o.responsibleParty ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{o.obligation}</td>
                  <td className="px-4 py-3 text-slate-600">{o.deadline ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{o.pageNumber ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "deadlines" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DeadlineCard item={{ description: "Contract start date", dateOrTimeframe: mockDeadlines.contractStartDate, pageNumber: null }} />
          <DeadlineCard item={{ description: "Contract end date", dateOrTimeframe: mockDeadlines.contractEndDate, pageNumber: null }} />
          <DeadlineCard item={{ description: "Renewal terms", dateOrTimeframe: mockDeadlines.renewalDate, pageNumber: null }} />
          <DeadlineCard item={{ description: "Termination notice period", dateOrTimeframe: mockDeadlines.terminationNoticePeriod, pageNumber: null }} />
          {[...mockDeadlines.paymentDeadlines, ...mockDeadlines.deliveryDeadlines, ...mockDeadlines.otherDates].map((d, i) => (
            <DeadlineCard key={i} item={d} />
          ))}
        </div>
      )}

      {activeTab === "ask" && (
        <div className="flex h-[520px] flex-col rounded-card border border-slate-200 bg-white shadow-card">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {mockChatMessages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
          </div>
          <div className="border-t border-slate-200 p-4">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask a question about this contract…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
              <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600 text-white hover:bg-accent-700">
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-card border border-slate-200 bg-white p-4 shadow-card">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-50 text-accent-600">
        <Icon size={15} />
      </span>
      <p className="mt-3 text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-ink-900">{value}</p>
    </div>
  );
}

function SummaryBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Users;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-accent-600" />
        <h3 className="font-medium text-ink-900">{title}</h3>
      </div>
      <div className="mt-2 text-sm text-slate-600">{children}</div>
    </div>
  );
}
