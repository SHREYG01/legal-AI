import { useEffect, useMemo, useState } from "react";
import { Search, Plus, X } from "lucide-react";
import ContractCard from "../components/ContractCard";
import EmptyState from "../components/EmptyState";
import UploadZone from "../components/UploadZone";
import { FileStack } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getContracts, uploadContract } from "../services/api";
import type { Contract, ContractMetadata, ContractStatus } from "../types";

const filters: { label: string; value: ContractStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Ready", value: "ready" },
  { label: "Processing", value: "processing" },
];

export default function ContractsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "all">("all");
  const [showUpload, setShowUpload] = useState(false);
  const [contracts, setContracts] = useState<ContractMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContracts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setContracts(await getContracts());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load contracts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadContracts();
  }, []);

  const displayContracts = useMemo<Contract[]>(
    () => contracts.map((contract) => ({
      id: contract.contract_id,
      filename: contract.filename,
      uploadDate: new Date(contract.upload_date).toLocaleDateString(),
      pages: contract.num_pages ?? 0,
      status: "ready",
      riskCount: 0,
      highRiskCount: 0,
    })),
    [contracts],
  );

  const filtered = displayContracts.filter((c) => {
    const matchesQuery = c.filename.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const handleFileSelected = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const uploaded = await uploadContract(file);
      setShowUpload(false);
      await loadContracts();
      navigate(`/contracts/${uploaded.contract_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload contract.");
    } finally {
      setIsUploading(false);
    }
  };

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

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-risk-high/20 bg-risk-high/5 px-4 py-3 text-sm text-risk-high">
          <span>{error}</span>
          <button onClick={() => void loadContracts()} className="font-medium underline">Retry</button>
        </div>
      )}

      {showUpload && (
        <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-ink-900">Upload a new contract</h2>
            <button onClick={() => setShowUpload(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <UploadZone onFileSelected={handleFileSelected} disabled={isUploading} />
          {isUploading && <p className="mt-3 text-center text-sm text-slate-500">Uploading and analyzing contract…</p>}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="rounded-card border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading contracts…</div>
        ) : filtered.length > 0 ? (
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
