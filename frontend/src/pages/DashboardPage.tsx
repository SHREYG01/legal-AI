import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileStack, ShieldAlert, CalendarClock, ListChecks, ArrowRight } from "lucide-react";
import StatCard from "../components/StatCard";
import ContractCard from "../components/ContractCard";
import { getContracts } from "../services/api";
import type { Contract, ContractMetadata } from "../types";
import { LoadingState } from "../components/LoadingState";

export default function DashboardPage() {
  const [contracts, setContracts] = useState<ContractMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void getContracts().then(setContracts).finally(() => setLoading(false)); }, []);
  const display: Contract[] = contracts.map((item) => ({ id: item.contract_id, filename: item.filename, uploadDate: new Date(item.upload_date).toLocaleDateString(), pages: item.num_pages ?? 0, status: "ready", riskCount: 0, highRiskCount: 0 }));
  return <div className="flex flex-col gap-6"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatCard label="Contracts analyzed" value={contracts.length} icon={FileStack} /><StatCard label="High-risk clauses" value="—" icon={ShieldAlert} tone="warning" /><StatCard label="Upcoming deadlines" value="—" icon={CalendarClock} /><StatCard label="Open obligations" value="—" icon={ListChecks} /></div>{loading ? <LoadingState /> : <div className="grid grid-cols-1 gap-6 lg:grid-cols-3"><div className="lg:col-span-2 rounded-card border border-slate-200 bg-white p-5 shadow-card"><div className="flex items-center justify-between"><h2 className="font-medium text-ink-900">Recent contracts</h2><Link to="/contracts" className="flex items-center gap-1 text-sm font-medium text-accent-600">View all <ArrowRight size={14} /></Link></div><div className="mt-4 flex flex-col gap-3">{display.slice(0, 3).map((contract) => <ContractCard key={contract.id} contract={contract} />)}{!display.length && <p className="text-sm text-slate-500">No contracts uploaded yet.</p>}</div></div><div className="rounded-card border border-slate-200 bg-white p-5 shadow-card"><h2 className="font-medium text-ink-900">Risk overview</h2><p className="mt-4 text-sm text-slate-500">Open a contract analysis to calculate risks and review findings.</p></div></div>}</div>;
}
