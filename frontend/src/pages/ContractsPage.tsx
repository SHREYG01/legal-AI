import { useState } from "react";
import { Search, Plus, X } from "lucide-react";
import ContractCard from "../components/ContractCard";
import EmptyState from "../components/EmptyState";
import UploadZone from "../components/UploadZone";
import { FileStack } from "lucide-react";
import { mockContracts } from "../data/mockData";
import type { ContractStatus } from "../types";

const filters: { label: string; value: ContractStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Ready", value: "ready" },
  { label: "Processing", value: "processing" },
];

export default function ContractsPage() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "all">("all");
  const [showUpload, setShowUpload] = useState(false);

  const filtered = mockContracts.filter((c) => {
    const matchesQuery = c.filename.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:max-w-xs">
          <Search size={16} className="text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contracts…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === f.value ? "bg-ink-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700"
        >
          <Plus size={16} />
          Upload contract
        </button>
      </div>

      {showUpload && (
        <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-ink-900">Upload a new contract</h2>
            <button onClick={() => setShowUpload(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <UploadZone />
        </div>
      )}

      <div className="flex flex-col gap-3">
        {filtered.length > 0 ? (
          filtered.map((c) => <ContractCard key={c.id} contract={c} />)
        ) : (
          <EmptyState
            icon={FileStack}
            title="No contracts found"
            description="Try a different search term or filter, or upload a new contract to get started."
            action={
              <button
                onClick={() => setShowUpload(true)}
                className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white hover:bg-ink-700"
              >
                Upload contract
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
