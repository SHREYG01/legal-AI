import { MapPin } from "lucide-react";
import type { RiskFinding } from "../types";
import RiskBadge from "./RiskBadge";

export default function RiskCard({ risk }: { risk: RiskFinding }) {
  return (
    <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-ink-900">{risk.title}</h3>
        <RiskBadge severity={risk.severity} />
      </div>
      <p className="mt-2 text-sm text-slate-600">{risk.explanation}</p>
      <blockquote className="mt-3 border-l-2 border-slate-200 pl-3 text-sm italic text-slate-500">
        "{risk.evidence}"
      </blockquote>
      {(risk.pageNumber || risk.section) && (
        <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
          <MapPin size={12} />
          {risk.section && <span>{risk.section}</span>}
          {risk.section && risk.pageNumber && <span>·</span>}
          {risk.pageNumber && <span>Page {risk.pageNumber}</span>}
        </div>
      )}
    </div>
  );
}
