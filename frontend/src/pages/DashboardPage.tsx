import { Link } from "react-router-dom";
import { FileStack, ShieldAlert, CalendarClock, ListChecks, ArrowRight } from "lucide-react";
import StatCard from "../components/StatCard";
import ContractCard from "../components/ContractCard";
import RiskBadge from "../components/RiskBadge";
import { mockContracts, mockRisks, mockDeadlines } from "../data/mockData";

export default function DashboardPage() {
  const upcomingDeadlines = [
    { label: "Renewal notice due", value: mockDeadlines.renewalDate, contract: "MSA_Northwind_Supply_2026.pdf" },
    { label: "Contract expires", value: mockDeadlines.contractEndDate, contract: "MSA_Northwind_Supply_2026.pdf" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Contracts analyzed" value={mockContracts.length} icon={FileStack} />
        <StatCard
          label="High-risk clauses"
          value={mockContracts.reduce((sum, c) => sum + c.highRiskCount, 0)}
          icon={ShieldAlert}
          tone="warning"
        />
        <StatCard label="Upcoming deadlines" value={2} icon={CalendarClock} />
        <StatCard label="Open obligations" value={5} icon={ListChecks} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-card border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-ink-900">Recent contracts</h2>
            <Link to="/contracts" className="flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {mockContracts.slice(0, 3).map((c) => (
              <ContractCard key={c.id} contract={c} />
            ))}
          </div>
        </div>

        <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="font-medium text-ink-900">Risk overview</h2>
          <div className="mt-4 flex flex-col gap-3">
            {mockRisks.slice(0, 3).map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{r.title}</p>
                  <p className="text-xs text-slate-500">{r.section}</p>
                </div>
                <RiskBadge severity={r.severity} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="font-medium text-ink-900">Upcoming deadlines</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {upcomingDeadlines.map((d) => (
            <div key={d.label} className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                <CalendarClock size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900">{d.label}</p>
                <p className="text-sm text-slate-600">{d.value}</p>
                <p className="mt-0.5 truncate text-xs text-slate-400">{d.contract}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
