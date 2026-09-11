import { useEffect, useState } from "react";
import { GitCompare, Sparkles } from "lucide-react";
import ComparisonResult from "../components/ComparisonResult";
import EmptyState from "../components/EmptyState";
import DisclaimerBanner from "../components/DisclaimerBanner";
import { compareContracts, getContracts } from "../services/api";
import type { ChangeItem, ContractMetadata } from "../types";

export default function ComparisonPage() {
  const [contracts, setContracts] = useState<ContractMetadata[]>([]);
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [summary, setSummary] = useState("");
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void getContracts().then(setContracts).catch(() => undefined); }, []);
  const compare = async () => {
    if (!fileA || !fileB) { setError("Choose both contract files before comparing."); return; }
    setLoading(true); setError(null);
    try { const result = await compareContracts(fileA, fileB); setSummary(result.ai_summary); setChanges(result.changes.map((item, index) => ({ id: `${index}`, changeType: item.change_type, section: item.section, pageNumberA: item.page_number_a, pageNumberB: item.page_number_b, textA: item.text_a, textB: item.text_b }))); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to compare contracts."); } finally { setLoading(false); }
  };
  return <div className="flex flex-col gap-6"><div className="rounded-card border border-slate-200 bg-white p-5 shadow-card"><h2 className="font-medium text-ink-900">Compare two contract versions</h2><p className="mt-1 text-sm text-slate-500">Upload two PDF or DOCX files to compare their clauses.</p><div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] items-end"><FilePicker label="Version A" file={fileA} onChange={setFileA} /><FilePicker label="Version B" file={fileB} onChange={setFileB} /><button onClick={() => void compare()} disabled={loading} className="flex items-center justify-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-ink-700 disabled:opacity-50"><GitCompare size={15} />{loading ? "Comparing…" : "Compare"}</button></div>{contracts.length > 0 && <p className="mt-3 text-xs text-slate-400">{contracts.length} uploaded contract{contracts.length === 1 ? "" : "s"} available for reference. Existing-contract comparison will be enabled when the backend accepts contract IDs.</p>}</div>{error && <div className="rounded-lg border border-risk-high/20 bg-risk-high/5 px-4 py-3 text-sm text-risk-high">{error}</div>}{!summary && !loading ? <EmptyState icon={GitCompare} title="Select two contracts to compare" description="Choose two files above and Counsel will highlight everything that changed." /> : <>{summary && <div className="rounded-card border border-accent-100 bg-accent-50 p-5"><div className="flex items-center gap-2"><Sparkles size={16} className="text-accent-600" /><h3 className="font-medium text-ink-900">AI change summary</h3></div><p className="mt-2 text-sm text-slate-700">{summary}</p></div>}<div className="flex flex-col gap-4">{changes.map((change) => <ComparisonResult key={change.id} change={change} />)}</div><DisclaimerBanner compact /></>}</div>;
}

function FilePicker({ label, file, onChange }: { label: string; file: File | null; onChange: (file: File | null) => void }) { return <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">{label}</span><input type="file" accept=".pdf,.docx" onChange={(event) => onChange(event.target.files?.[0] ?? null)} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600" /><span className="mt-1 block truncate text-xs text-slate-400">{file?.name ?? "No file selected"}</span></label>; }
