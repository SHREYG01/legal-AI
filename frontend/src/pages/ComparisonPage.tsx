import { useState } from "react";
import { GitCompare, ChevronDown, Sparkles } from "lucide-react";
import ComparisonResult from "../components/ComparisonResult";
import EmptyState from "../components/EmptyState";
import DisclaimerBanner from "../components/DisclaimerBanner";
import { mockContracts, mockChanges, mockAiChangeSummary } from "../data/mockData";

export default function ComparisonPage() {
  const [versionA, setVersionA] = useState(mockContracts[0].id);
  const [versionB, setVersionB] = useState(mockContracts[1].id);
  const [compared, setCompared] = useState(true);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="font-medium text-ink-900">Compare two contract versions</h2>
        <div className="mt-4 grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_auto_1fr_auto]">
          <ContractSelect label="Version A" value={versionA} onChange={setVersionA} />
          <span className="hidden justify-self-center text-sm font-medium text-slate-400 sm:block">vs</span>
          <ContractSelect label="Version B" value={versionB} onChange={setVersionB} />
          <button
            onClick={() => setCompared(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-ink-700"
          >
            <GitCompare size={15} />
            Compare
          </button>
        </div>
      </div>

      {!compared ? (
        <EmptyState
          icon={GitCompare}
          title="Select two contracts to compare"
          description="Choose two versions above and Counsel will highlight everything that changed between them."
        />
      ) : (
        <>
          <div className="rounded-card border border-accent-100 bg-accent-50 p-5">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-accent-600" />
              <h3 className="font-medium text-ink-900">AI change summary</h3>
            </div>
            <p className="mt-2 text-sm text-slate-700">{mockAiChangeSummary}</p>
          </div>

          <div className="flex flex-col gap-4">
            {mockChanges.map((c) => (
              <ComparisonResult key={c.id} change={c} />
            ))}
          </div>

          <DisclaimerBanner compact />
        </>
      )}
    </div>
  );
}

function ContractSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-ink-900 outline-none"
        >
          {mockContracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.filename}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  );
}
